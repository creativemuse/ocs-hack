import {
  cre,
  Runner,
  type Runtime,
  type NodeRuntime,
  type CronPayload,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  encodeCallMsg,
  bytesToHex,
  hexToBase64,
  consensusMedianAggregation,
} from "@chainlink/cre-sdk"
import { encodeFunctionData, decodeFunctionResult, zeroAddress } from "viem"

type EvmConfig = {
  chainName: string
  contractAddress: string
  gasLimit: string
}

type Config = {
  schedule: string
  /** Optional app URL for pre-distribution score sync (POST /api/submit-onchain-scores). */
  scoreSyncApiUrl?: string
  evms: EvmConfig[]
}

type SessionInfo = {
  startTime: bigint
  endTime: bigint
  prizePool: bigint
  paidPlayerCount: bigint
  trialPlayerCount: bigint
  isActive: boolean
  prizesDistributed: boolean
  sessionCounter: bigint
}

type DistributionAction = "skipped" | "distributed" | "failed"

type DistributionResult = {
  action: DistributionAction
  distributionExecuted: boolean
  reason: string
  txHash?: string
  receiptStatus?: string
  scoreSyncAttempted?: boolean
  scoreSyncSucceeded?: boolean
}

const initWorkflow = (config: Config) => {
  const cronTrigger = new cre.capabilities.CronCapability().trigger({
    schedule: config.schedule,
  })

  return [cre.handler(cronTrigger, onWeeklyDistribution)]
}

const onWeeklyDistribution = (
  runtime: Runtime<Config>,
  payload: CronPayload
): DistributionResult => {
  const evmConfig = runtime.config.evms[0]

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: evmConfig.chainName.includes("testnet") || evmConfig.chainName.includes("sepolia"),
  })

  if (!network) {
    throw new Error(`Unknown chain name: ${evmConfig.chainName}`)
  }

  runtime.log(`Weekly distribution check triggered for contract: ${evmConfig.contractAddress}`)

  const sessionInfo = readSessionInfo(runtime, network.chainSelector.selector, evmConfig)

  runtime.log(
    `Session state - Active: ${sessionInfo.isActive}, Prize Pool: ${sessionInfo.prizePool}, Distributed: ${sessionInfo.prizesDistributed}, End Time: ${sessionInfo.endTime}, Session Counter: ${sessionInfo.sessionCounter}, Players: ${sessionInfo.paidPlayerCount}`
  )

  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  const isSessionEnded = !sessionInfo.isActive || currentTime > sessionInfo.endTime

  const skip = (reason: string): DistributionResult => {
    runtime.log(reason)
    return {
      action: "skipped",
      distributionExecuted: false,
      reason,
    }
  }

  if (sessionInfo.sessionCounter === BigInt(0)) {
    return skip(
      `No session has been started yet (sessionCounter = 0). Skipping distribution.`
    )
  }

  if (!isSessionEnded) {
    return skip(
      `Session still active. End time: ${sessionInfo.endTime}, Current time: ${currentTime}`
    )
  }

  if (sessionInfo.prizesDistributed) {
    return skip(`Prizes already distributed for session ${sessionInfo.sessionCounter}`)
  }

  if (sessionInfo.prizePool === BigInt(0)) {
    return skip(
      `No prize pool to distribute for session ${sessionInfo.sessionCounter} (prize pool: 0, players: ${sessionInfo.paidPlayerCount}).`
    )
  }

  let scoreSyncAttempted = false
  let scoreSyncSucceeded = false
  let hasScores = verifyScoresExist(runtime, network.chainSelector.selector, evmConfig)

  if (!hasScores) {
    runtime.log(
      `No on-chain scores for session ${sessionInfo.sessionCounter}. Attempting pre-distribution score sync...`
    )
    scoreSyncAttempted = true
    scoreSyncSucceeded = syncScoresFromApp(runtime)
    if (scoreSyncSucceeded) {
      runtime.log("Pre-distribution score sync succeeded; re-checking on-chain scores")
      hasScores = verifyScoresExist(runtime, network.chainSelector.selector, evmConfig)
    } else {
      runtime.log("Pre-distribution score sync skipped or failed")
    }
  }

  if (!hasScores) {
    return {
      action: "skipped",
      distributionExecuted: false,
      scoreSyncAttempted,
      scoreSyncSucceeded,
      reason: `No player scores on-chain for session ${sessionInfo.sessionCounter}. Sync scores via /api/submit-onchain-scores before distribution.`,
    }
  }

  runtime.log("All conditions met. Executing distributePrizes()...")

  try {
    const txHash = callDistributePrizes(
      runtime,
      network.chainSelector.selector,
      evmConfig
    )

    const receipt = verifyDistributionReceipt(
      runtime,
      network.chainSelector.selector,
      evmConfig,
      txHash
    )

    if (receipt.status === "success") {
      runtime.log(`Distribution confirmed on-chain: ${txHash}`)
      return {
        action: "distributed",
        distributionExecuted: true,
        reason: "Prizes distributed successfully",
        txHash,
        receiptStatus: receipt.status,
        scoreSyncAttempted,
        scoreSyncSucceeded,
      }
    }

    return {
      action: "failed",
      distributionExecuted: false,
      reason: `Distribution tx ${txHash} did not succeed on-chain (${receipt.status})`,
      txHash,
      receiptStatus: receipt.status,
      scoreSyncAttempted,
      scoreSyncSucceeded,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    runtime.log(`Distribution failed: ${errorMessage}`)
    return {
      action: "failed",
      distributionExecuted: false,
      reason: `Distribution failed: ${errorMessage}`,
      scoreSyncAttempted,
      scoreSyncSucceeded,
    }
  }
}

function syncScoresFromApp(runtime: Runtime<Config>): boolean {
  const apiUrl = runtime.config.scoreSyncApiUrl?.trim()
  if (!apiUrl) {
    runtime.log("scoreSyncApiUrl not configured; cannot auto-sync scores")
    return false
  }

  let adminSecret = ""
  try {
    const secretValue = runtime.getSecret({ key: "ADMIN_API_SECRET" }).result()
    adminSecret =
      typeof secretValue === "string"
        ? secretValue
        : new TextDecoder().decode(secretValue as Uint8Array)
  } catch {
    runtime.log("ADMIN_API_SECRET not available in CRE secrets; cannot auto-sync scores")
    return false
  }

  if (!adminSecret) {
    runtime.log("ADMIN_API_SECRET is empty")
    return false
  }

  // DON nodes each invoke this HTTP call; the API is idempotent and skips owner
  // writes when scores are already on-chain to avoid nonce collisions.
  const syncScore = (nodeRuntime: NodeRuntime<Config>): number => {
    const httpClient = new cre.capabilities.HTTPClient()
    const resp = httpClient
      .sendRequest(nodeRuntime, {
        url: apiUrl,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminSecret}`,
          "Content-Type": "application/json",
        },
        body: new TextEncoder().encode("{}"),
      })
      .result()

    const status = resp.statusCode ?? 0
    nodeRuntime.log(`Score sync HTTP status: ${status}`)
    return status >= 200 && status < 300 ? 1 : 0
  }

  const result = runtime.runInNodeMode(syncScore, consensusMedianAggregation())().result()
  return result >= 1
}

const RECEIPT_POLL_ATTEMPTS = 12

function readFinalizedBlockNumber(
  runtime: Runtime<Config>,
  chainSelector: bigint
): bigint | null {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  try {
    const header = evmClient
      .headerByNumber(runtime, {
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result() as { header?: { number?: string | number | bigint }; number?: string | number | bigint }

    const raw = header.header?.number ?? header.number
    if (raw === undefined || raw === null) {
      return null
    }
    return typeof raw === "bigint" ? raw : BigInt(raw)
  } catch {
    return null
  }
}

function verifyDistributionReceipt(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  txHash: string
): { status: "success" | "reverted" | "pending" | "unknown" } {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  let lastSeenBlock = BigInt(0)

  for (let attempt = 1; attempt <= RECEIPT_POLL_ATTEMPTS; attempt++) {
    const blockNumber = readFinalizedBlockNumber(runtime, chainSelector)
    if (blockNumber !== null && blockNumber > lastSeenBlock) {
      lastSeenBlock = blockNumber
      runtime.log(
        `Receipt poll ${attempt}/${RECEIPT_POLL_ATTEMPTS} at finalized block ${blockNumber}`
      )
    } else {
      runtime.log(`Receipt poll ${attempt}/${RECEIPT_POLL_ATTEMPTS} (awaiting new block)`)
    }

    const poolBeforeReceipt = readSessionInfo(runtime, chainSelector, evmConfig).prizePool
    if (poolBeforeReceipt === BigInt(0)) {
      runtime.log("Prize pool cleared — distribution confirmed via state")
      return { status: "success" }
    }

    try {
      const receiptReply = evmClient
        .getTransactionReceipt(runtime, {
          hash: txHash,
        })
        .result()

      const receipt = receiptReply as {
        receipt?: { status?: number | string }
        status?: number | string
      }

      const rawStatus = receipt.receipt?.status ?? receipt.status
      if (rawStatus === undefined || rawStatus === null) {
        continue
      }

      const statusNum =
        typeof rawStatus === "string" ? parseInt(rawStatus, 16) : Number(rawStatus)

      if (statusNum === 1) {
        return { status: "success" }
      }

      if (statusNum === 0) {
        return { status: "reverted" }
      }
    } catch (error) {
      runtime.log(
        `Receipt poll attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const poolAfter = readSessionInfo(runtime, chainSelector, evmConfig).prizePool
  if (poolAfter === BigInt(0)) {
    return { status: "success" }
  }

  return { status: "pending" }
}

function readSessionInfo(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): SessionInfo {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  const contractAddress = evmConfig.contractAddress as `0x${string}`

  const isActiveCall = encodeFunctionData({
    abi: [{ inputs: [], name: "isSessionActive", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" }],
    functionName: "isSessionActive",
  })
  const isActiveResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: isActiveCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const isActive = decodeFunctionResult({
    abi: [{ inputs: [], name: "isSessionActive", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" }],
    functionName: "isSessionActive",
    data: bytesToHex(isActiveResult.data),
  }) as boolean

  const lastSessionTimeCall = encodeFunctionData({
    abi: [{ inputs: [], name: "lastSessionTime", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "lastSessionTime",
  })
  const lastSessionTimeResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: lastSessionTimeCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const lastSessionTime = decodeFunctionResult({
    abi: [{ inputs: [], name: "lastSessionTime", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "lastSessionTime",
    data: bytesToHex(lastSessionTimeResult.data),
  }) as bigint

  const sessionIntervalCall = encodeFunctionData({
    abi: [{ inputs: [], name: "sessionInterval", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "sessionInterval",
  })
  const sessionIntervalResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: sessionIntervalCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const sessionInterval = decodeFunctionResult({
    abi: [{ inputs: [], name: "sessionInterval", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "sessionInterval",
    data: bytesToHex(sessionIntervalResult.data),
  }) as bigint

  const currentSessionPrizePoolCall = encodeFunctionData({
    abi: [{ inputs: [], name: "currentSessionPrizePool", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "currentSessionPrizePool",
  })
  const prizePoolResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: currentSessionPrizePoolCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const prizePool = decodeFunctionResult({
    abi: [{ inputs: [], name: "currentSessionPrizePool", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "currentSessionPrizePool",
    data: bytesToHex(prizePoolResult.data),
  }) as bigint

  const getCurrentPlayersCall = encodeFunctionData({
    abi: [{ inputs: [], name: "getCurrentPlayers", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" }],
    functionName: "getCurrentPlayers",
  })
  const playersResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: getCurrentPlayersCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const players = decodeFunctionResult({
    abi: [{ inputs: [], name: "getCurrentPlayers", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" }],
    functionName: "getCurrentPlayers",
    data: bytesToHex(playersResult.data),
  }) as `0x${string}`[]

  const sessionCounterCall = encodeFunctionData({
    abi: [{ inputs: [], name: "sessionCounter", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "sessionCounter",
  })
  const sessionCounterResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: sessionCounterCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const sessionCounter = decodeFunctionResult({
    abi: [{ inputs: [], name: "sessionCounter", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "sessionCounter",
    data: bytesToHex(sessionCounterResult.data),
  }) as bigint

  const startTime = lastSessionTime
  const endTime = lastSessionTime + sessionInterval
  const paidPlayerCount = BigInt(players.length)
  const trialPlayerCount = BigInt(0)

  const prizesDistributed = sessionCounter > BigInt(0) && !isActive && prizePool === BigInt(0)

  return {
    startTime,
    endTime,
    prizePool,
    paidPlayerCount,
    trialPlayerCount,
    isActive,
    prizesDistributed,
    sessionCounter,
  }
}

function verifyScoresExist(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): boolean {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  const getCurrentPlayersCall = encodeFunctionData({
    abi: [{ inputs: [], name: "getCurrentPlayers", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" }],
    functionName: "getCurrentPlayers",
  })
  const playersResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: getCurrentPlayersCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const players = decodeFunctionResult({
    abi: [{ inputs: [], name: "getCurrentPlayers", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" }],
    functionName: "getCurrentPlayers",
    data: bytesToHex(playersResult.data),
  }) as `0x${string}`[]

  if (players.length === 0) {
    runtime.log("No players found in current session")
    return false
  }

  for (const player of players) {
    const getScoreCall = encodeFunctionData({
      abi: [{ inputs: [{ name: "player", type: "address" }], name: "getPlayerScore", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
      functionName: "getPlayerScore",
      args: [player],
    })
    const scoreResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: getScoreCall }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()
    const score = decodeFunctionResult({
      abi: [{ inputs: [{ name: "player", type: "address" }], name: "getPlayerScore", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
      functionName: "getPlayerScore",
      data: bytesToHex(scoreResult.data),
    }) as bigint

    if (score > BigInt(0)) {
      runtime.log(`Player ${player} has score: ${score}`)
      return true
    }
  }

  runtime.log(`Checked ${players.length} players - no scores found`)
  return false
}

function callDistributePrizes(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): string {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  const callData = encodeFunctionData({
    abi: [
      {
        inputs: [],
        name: "distributePrizes",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    functionName: "distributePrizes",
  })

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(callData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.contractAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: evmConfig.gasLimit,
      },
    })
    .result()

  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))

  runtime.log(`Transaction submitted: ${txHash}`)

  return txHash
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}

main()
