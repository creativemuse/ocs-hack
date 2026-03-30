import {
  cre,
  Runner,
  type Runtime,
  type CronPayload,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  encodeCallMsg,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk"
import { encodeFunctionData, decodeFunctionResult, zeroAddress } from "viem"

type EvmConfig = {
  chainName: string
  contractAddress: string
  gasLimit: string
}

type Config = {
  schedule: string
  evms: EvmConfig[]
}

// Session info struct matching the contract
type SessionInfo = {
  startTime: bigint
  endTime: bigint
  prizePool: bigint
  paidPlayerCount: bigint
  trialPlayerCount: bigint
  isActive: boolean
  prizesDistributed: boolean
  sessionCounter: bigint // Added to track if session was actually started
}

type DistributionResult = {
  distributionExecuted: boolean
  reason: string
  txHash?: string
}

const initWorkflow = (config: Config) => {
  // Weekly cron: Every Sunday at 00:00 UTC
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

  // Convert the human-readable chain name to a chain selector
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: evmConfig.chainName.includes("testnet") || evmConfig.chainName.includes("sepolia"),
  })

  if (!network) {
    throw new Error(`Unknown chain name: ${evmConfig.chainName}`)
  }

  runtime.log(`Weekly distribution check triggered for contract: ${evmConfig.contractAddress}`)

  // Step 1: Read current session state
  const sessionInfo = readSessionInfo(runtime, network.chainSelector.selector, evmConfig)

  runtime.log(
    `Session state - Active: ${sessionInfo.isActive}, Prize Pool: ${sessionInfo.prizePool}, Distributed: ${sessionInfo.prizesDistributed}, End Time: ${sessionInfo.endTime}, Session Counter: ${sessionInfo.sessionCounter}, Players: ${sessionInfo.paidPlayerCount}`
  )

  // Step 2: Check if distribution is needed
  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  const isSessionEnded = !sessionInfo.isActive || currentTime > sessionInfo.endTime

  // Early check: If no session was ever started, skip distribution
  if (sessionInfo.sessionCounter === BigInt(0)) {
    const reason = `No session has been started yet (sessionCounter = 0). This is expected for a new contract. Skipping distribution.`
    runtime.log(reason)
    return {
      distributionExecuted: false,
      reason,
    }
  }

  if (!isSessionEnded) {
    const reason = `Session still active. End time: ${sessionInfo.endTime}, Current time: ${currentTime}`
    runtime.log(reason)
    return {
      distributionExecuted: false,
      reason,
    }
  }

  if (sessionInfo.prizesDistributed) {
    const reason = `Prizes already distributed for session ${sessionInfo.sessionCounter}`
    runtime.log(reason)
    return {
      distributionExecuted: false,
      reason,
    }
  }

  if (sessionInfo.prizePool === BigInt(0)) {
    const reason = `No prize pool to distribute for session ${sessionInfo.sessionCounter} (prize pool: 0, players: ${sessionInfo.paidPlayerCount}). This may mean prizes were already distributed or no players joined.`
    runtime.log(reason)
    return {
      distributionExecuted: false,
      reason,
    }
  }

  // Step 3: Call distributePrizes()
  runtime.log("Conditions met. Executing distributePrizes()...")

  try {
    const txHash = callDistributePrizes(
      runtime,
      network.chainSelector.selector,
      evmConfig
    )

    runtime.log(`Distribution transaction successful: ${txHash}`)

    return {
      distributionExecuted: true,
      reason: "Prizes distributed successfully",
      txHash,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    runtime.log(`Distribution failed: ${errorMessage}`)
    return {
      distributionExecuted: false,
      reason: `Distribution failed: ${errorMessage}`,
    }
  }
}

// Read session info from the contract
// Note: The contract doesn't have getSessionInfo(), so we read individual state variables
function readSessionInfo(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): SessionInfo {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  // Read individual public state variables
  const contractAddress = evmConfig.contractAddress as `0x${string}`
  
  // Read isSessionActive (bool)
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

  // Read lastSessionTime (uint256)
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

  // Read sessionInterval (uint256)
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

  // Read prize pool from USDC balance
  const getContractUsdcBalanceCall = encodeFunctionData({
    abi: [{ inputs: [], name: "getContractUsdcBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "getContractUsdcBalance",
  })
  const prizePoolResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: getContractUsdcBalanceCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const prizePool = decodeFunctionResult({
    abi: [{ inputs: [], name: "getContractUsdcBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "getContractUsdcBalance",
    data: bytesToHex(prizePoolResult.data),
  }) as bigint

  // Read player counts
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

  // Read sessionCounter to verify if a session was actually started
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

  // Calculate session times
  const startTime = lastSessionTime
  const endTime = lastSessionTime + sessionInterval
  const paidPlayerCount = BigInt(players.length)
  const trialPlayerCount = BigInt(0) // Not tracked separately in this contract version
  
  // Improved heuristic: Only assume prizes distributed if:
  // 1. A session was actually started (sessionCounter > 0)
  // 2. Session has ended (not active)
  // 3. Prize pool is empty
  // This distinguishes between "no activity yet" vs "prizes already distributed"
  const prizesDistributed = sessionCounter > BigInt(0) && !isActive && prizePool === BigInt(0)

  return {
    startTime,
    endTime,
    prizePool,
    paidPlayerCount,
    trialPlayerCount,
    isActive,
    prizesDistributed,
    sessionCounter, // Include sessionCounter in return value
  }
}

// Call distributePrizes() on the contract
// Note: This function uses onlyOwnerOrChainlink modifier, allowing Chainlink CRE to call it
// The contract must have chainlinkOracle set to the CRE forwarder address
function callDistributePrizes(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): string {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  // Encode the distributePrizes() function call
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

  // Generate a signed report for the transaction
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(callData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  // Submit the report to the contract
  // The contract must have chainlinkOracle set to the CRE forwarder address
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
