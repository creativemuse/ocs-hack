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

// PrizesDistributed event ABI
const PRIZES_DISTRIBUTED_ABI = [
  {
    type: "event",
    name: "PrizesDistributed",
    inputs: [
      { name: "sessionId", type: "uint256", indexed: true },
      { name: "winners", type: "address[]", indexed: false },
      { name: "prizeAmounts", type: "uint256[]", indexed: false },
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

  // Compute event signature hash for PrizesDistributed(uint256,address[],uint256[])
  const prizesDistributedEventHash = keccak256(
    toBytes("PrizesDistributed(uint256,address[],uint256[])")
  )

  // Monitor PrizesDistributed events
  const prizesDistributedTrigger = evmClient.logTrigger({
    addresses: [hexToBase64(contractAddress)],
    topics: [{ values: [hexToBase64(prizesDistributedEventHash)] }],
  })

  return [cre.handler(prizesDistributedTrigger, onPrizesDistributed)]
}

const onPrizesDistributed = (
  runtime: Runtime<Config>,
  log: EVMLog
): string => {
  try {
    const topics = log.topics.map((topic) => bytesToHex(topic)) as [`0x${string}`, ...`0x${string}`[]]
    const data = bytesToHex(log.data)
    
    const decoded = decodeEventLog({
      abi: PRIZES_DISTRIBUTED_ABI,
      data,
      topics,
    })

    const sessionId = decoded.args.sessionId
    const winners = decoded.args.winners
    const prizeAmounts = decoded.args.prizeAmounts

    runtime.log(
      `Prizes Distributed - Session ID: ${sessionId}, Winners: ${winners.length}, Total Prize Pool: ${prizeAmounts.reduce((sum, amount) => sum + amount, BigInt(0))}`
    )

    // Log individual winners
    for (let i = 0; i < winners.length; i++) {
      runtime.log(
        `  Winner ${i + 1}: ${winners[i]} - Prize: ${prizeAmounts[i]} USDC`
      )
    }

    return `PrizesDistributed processed: Session ${sessionId}, ${winners.length} winners`
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    runtime.log(`Error processing PrizesDistributed event: ${errorMessage}`)
    return `Error: ${errorMessage}`
  }
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}

main()
