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
  /** Optional app URL for CRE-fetched session rankings (GET /api/chainlink/session-rankings). */
  sessionRankingsApiUrl?: string
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
      `No on-chain scores for session ${sessionInfo.sessionCounter}. Attempting CRE rankings sync...`
    )
    scoreSyncAttempted = true
    const rankingsSync = syncScoresFromRankingsApi(
      runtime,
      network.chainSelector.selector,
      evmConfig
    )
    if (rankingsSync.synced) {
      runtime.log("Rankings-based on-chain score sync submitted; re-checking synced player scores")
      hasScores = verifyScoresForPlayers(
        runtime,
        network.chainSelector.selector,
        evmConfig,
        rankingsSync.addresses
      )
    }
  }

  if (!hasScores) {
    runtime.log(
      `Rankings sync unavailable or incomplete. Attempting HTTP score sync fallback...`
    )
    scoreSyncAttempted = true
    scoreSyncSucceeded = syncScoresFromApp(runtime)
    if (scoreSyncSucceeded) {
      runtime.log("HTTP score sync succeeded; re-checking on-chain scores once")
      hasScores = verifyScoresExist(runtime, network.chainSelector.selector, evmConfig)
    } else {
      runtime.log("HTTP score sync skipped or failed")
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

function syncScoresFromRankingsApi(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): { synced: boolean; addresses: `0x${string}`[] } {
  const apiUrl = runtime.config.sessionRankingsApiUrl?.trim()
  if (!apiUrl) {
    runtime.log("sessionRankingsApiUrl not configured; skipping rankings sync")
    return { synced: false, addresses: [] }
  }

  const fetchRankings = (nodeRuntime: NodeRuntime<Config>): string => {
    const httpClient = new cre.capabilities.HTTPClient()
    const resp = httpClient
      .sendRequest(nodeRuntime, {
        url: apiUrl,
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })
      .result()

    const status = resp.statusCode ?? 0
    nodeRuntime.log(`Session rankings HTTP status: ${status}`)
    if (status < 200 || status >= 300) {
      return ""
    }

    const body = new TextDecoder().decode(resp.body ?? new Uint8Array())
    return body
  }

  const body = runtime.runInNodeMode(fetchRankings, consensusMedianAggregation())().result()
  if (!body) {
    return { synced: false, addresses: [] }
  }

  let parsed: {
    players?: { address: string; score: number }[]
    rankings?: string[]
  }
  try {
    parsed = JSON.parse(body) as {
      players?: { address: string; score: number }[]
      rankings?: string[]
    }
  } catch {
    runtime.log("Failed to parse session rankings JSON")
    return { synced: false, addresses: [] }
  }

  const playerEntries = parsed.players ?? []
  if (playerEntries.length === 0) {
    runtime.log("Session rankings API returned no scored players")
    return { synced: false, addresses: [] }
  }

  const addresses = playerEntries.map((entry) => entry.address as `0x${string}`)
  const scores = playerEntries.map((entry) => BigInt(entry.score))

  try {
    callSubmitScores(runtime, chainSelector, evmConfig, addresses, scores)
    return { synced: true, addresses }
  } catch (error) {
    runtime.log(
      `Rankings on-chain submit failed: ${error instanceof Error ? error.message : String(error)}`
    )
    return { synced: false, addresses: [] }
  }
}

const RECEIPT_ABI = [
  {
    inputs: [],
    name: "currentSessionPrizePool",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const GET_PLAYER_SCORE_ABI = [
  {
    inputs: [{ name: "player", type: "address" }],
    name: "getPlayerScore",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const GET_CURRENT_PLAYERS_ABI = [
  {
    inputs: [],
    name: "getCurrentPlayers",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const

function readCurrentSessionPrizePool(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): bigint {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  const currentSessionPrizePoolCall = encodeFunctionData({
    abi: RECEIPT_ABI,
    functionName: "currentSessionPrizePool",
  })
  const prizePoolResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: contractAddress,
        data: currentSessionPrizePoolCall,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  return decodeFunctionResult({
    abi: RECEIPT_ABI,
    functionName: "currentSessionPrizePool",
    data: bytesToHex(prizePoolResult.data),
  }) as bigint
}

function callSubmitScores(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  addresses: `0x${string}`[],
  scores: bigint[]
): string {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  const callData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: "playerAddresses", type: "address[]" },
          { name: "scores", type: "uint256[]" },
        ],
        name: "submitScores",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    functionName: "submitScores",
    args: [addresses, scores],
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
  runtime.log(`submitScores transaction submitted: ${txHash}`)
  return txHash
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

function verifyDistributionReceipt(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  txHash: string
): { status: "success" | "reverted" | "pending" | "unknown" } {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  const poolBeforeReceipt = readCurrentSessionPrizePool(runtime, chainSelector, evmConfig)
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
    if (rawStatus !== undefined && rawStatus !== null) {
      const statusNum =
        typeof rawStatus === "string" ? parseInt(rawStatus, 16) : Number(rawStatus)

      if (statusNum === 1) {
        return { status: "success" }
      }

      if (statusNum === 0) {
        return { status: "reverted" }
      }
    }
  } catch (error) {
    runtime.log(
      `Receipt check failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const poolAfter = readCurrentSessionPrizePool(runtime, chainSelector, evmConfig)
  if (poolAfter === BigInt(0)) {
    return { status: "success" }
  }

  runtime.log(
    "Distribution tx not finalized in this run; weekly cron will re-check session state"
  )
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

function verifyScoresForPlayers(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  players: `0x${string}`[]
): boolean {
  if (players.length === 0) {
    return false
  }

  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  for (const player of players) {
    const getScoreCall = encodeFunctionData({
      abi: GET_PLAYER_SCORE_ABI,
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
      abi: GET_PLAYER_SCORE_ABI,
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

function verifyScoresExist(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): boolean {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  const getCurrentPlayersCall = encodeFunctionData({
    abi: GET_CURRENT_PLAYERS_ABI,
    functionName: "getCurrentPlayers",
  })
  const playersResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: getCurrentPlayersCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const players = decodeFunctionResult({
    abi: GET_CURRENT_PLAYERS_ABI,
    functionName: "getCurrentPlayers",
    data: bytesToHex(playersResult.data),
  }) as `0x${string}`[]

  if (players.length === 0) {
    runtime.log("No players found in current session")
    return false
  }

  return verifyScoresForPlayers(runtime, chainSelector, evmConfig, players)
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
