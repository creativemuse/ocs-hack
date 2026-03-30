import {
  cre,
  Runner,
  type Runtime,
  type EVMLog,
  getNetwork,
  hexToBase64,
  bytesToHex,
} from "@chainlink/cre-sdk"
import { decodeEventLog, keccak256, toBytes } from "viem"

type EvmConfig = {
  chainName: string
  contractAddress: string
}

type Config = {
  evms: EvmConfig[]
}

// SessionStarted event ABI
const SESSION_STARTED_ABI = [
  {
    type: "event",
    name: "SessionStarted",
    inputs: [
      { name: "sessionId", type: "uint256", indexed: true },
      { name: "startTime", type: "uint256", indexed: false },
    ],
  },
] as const

// PlayerJoined event ABI
const PLAYER_JOINED_ABI = [
  {
    type: "event",
    name: "PlayerJoined",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "sessionId", type: "uint256", indexed: false },
    ],
  },
] as const

const initWorkflow = (config: Config) => {
  const evmConfig = config.evms[0]
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: evmConfig.chainName.includes("testnet") || evmConfig.chainName.includes("sepolia"),
  })

  if (!network) {
    throw new Error(`Unknown chain name: ${evmConfig.chainName}`)
  }

  const contractAddress = evmConfig.contractAddress as `0x${string}`
  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

  // Compute event signature hashes
  const sessionStartedEventHash = keccak256(toBytes("SessionStarted(uint256,uint256)"))
  const playerJoinedEventHash = keccak256(toBytes("PlayerJoined(address,uint256)"))

  // Monitor SessionStarted events
  const sessionStartedTrigger = evmClient.logTrigger({
    addresses: [hexToBase64(contractAddress)],
    topics: [{ values: [hexToBase64(sessionStartedEventHash)] }],
  })

  // Monitor PlayerJoined events
  const playerJoinedTrigger = evmClient.logTrigger({
    addresses: [hexToBase64(contractAddress)],
    topics: [{ values: [hexToBase64(playerJoinedEventHash)] }],
  })

  return [
    cre.handler(sessionStartedTrigger, onSessionStarted),
    cre.handler(playerJoinedTrigger, onPlayerJoined),
  ]
}

const onSessionStarted = (
  runtime: Runtime<Config>,
  log: EVMLog
): string => {
  try {
    const topics = log.topics.map((topic) => bytesToHex(topic)) as [`0x${string}`, ...`0x${string}`[]]
    const data = bytesToHex(log.data)
    
    const decoded = decodeEventLog({
      abi: SESSION_STARTED_ABI,
      data,
      topics,
    })

    runtime.log(
      `Session Started - Session ID: ${decoded.args.sessionId}, Start Time: ${decoded.args.startTime}`
    )

    return `SessionStarted processed: ${decoded.args.sessionId}`
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    runtime.log(`Error processing SessionStarted event: ${errorMessage}`)
    return `Error: ${errorMessage}`
  }
}

const onPlayerJoined = (
  runtime: Runtime<Config>,
  log: EVMLog
): string => {
  try {
    const topics = log.topics.map((topic) => bytesToHex(topic)) as [`0x${string}`, ...`0x${string}`[]]
    const data = bytesToHex(log.data)
    
    const decoded = decodeEventLog({
      abi: PLAYER_JOINED_ABI,
      data,
      topics,
    })

    runtime.log(
      `Player Joined - Address: ${decoded.args.player}, Session ID: ${decoded.args.sessionId}`
    )

    return `PlayerJoined processed: ${decoded.args.player}`
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    runtime.log(`Error processing PlayerJoined event: ${errorMessage}`)
    return `Error: ${errorMessage}`
  }
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}

main()
