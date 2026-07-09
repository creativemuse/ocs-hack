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
  sessionId: bigint
  startTime: bigint
  endTime: bigint
  prizePool: bigint
  paidPlayerCount: bigint
  trialPlayerCount: bigint
  isActive: boolean
  distributed: boolean
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
  targetSessionId?: string
}

const initWorkflow = (config: Config) => {
  const cronTrigger = new cre.capabilities.CronCapability().trigger({
    schedule: config.schedule,
  })

  return [cre.handler(cronTrigger, onWeeklyDistribution)]
}

// ─── ABIs (minimal, inline) ──────────────────────────────────────────────────

const SESSION_COUNTER_ABI = [
  {
    inputs: [],
    name: "sessionCounter",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const GET_SESSION_INFO_ABI = [
  {
    inputs: [{ name: "sessionId", type: "uint256" }],
    name: "getSessionInfo",
    outputs: [
      { name: "isActive", type: "bool" },
      { name: "distributed", type: "bool" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "playerCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const

const GET_PLAYER_SCORE_FOR_SESSION_ABI = [
  {
    inputs: [
      { name: "sessionId", type: "uint256" },
      { name: "player", type: "address" },
    ],
    name: "getPlayerScoreForSession",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const GET_CURRENT_PLAYERS_FOR_SESSION_ABI = [
  {
    inputs: [{ name: "sessionId", type: "uint256" }],
    name: "getCurrentPlayersForSession",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const SYNC_AND_DISTRIBUTE_FOR_SESSION_ABI = [
  {
    inputs: [
      { name: "sessionId", type: "uint256" },
      { name: "playerAddresses", type: "address[]" },
      { name: "scores", type: "uint256[]" },
    ],
    name: "syncAndDistributeForSession",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

const SUBMIT_SCORES_FOR_SESSION_ABI = [
  {
    inputs: [
      { name: "sessionId", type: "uint256" },
      { name: "playerAddresses", type: "address[]" },
      { name: "scores", type: "uint256[]" },
    ],
    name: "submitScoresForSession",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

const HAS_ANY_SCORES_FOR_SESSION_ABI = [
  {
    inputs: [{ name: "sessionId", type: "uint256" }],
    name: "hasAnyScoresForSession",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// ─── Main handler ────────────────────────────────────────────────────────────

const onWeeklyDistribution = (
  runtime: Runtime<Config>,
  _payload: CronPayload
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

  const chainSelector = network.chainSelector.selector
  runtime.log(`Weekly distribution check triggered for contract: ${evmConfig.contractAddress}`)

  // 1. Read the live sessionCounter
  const liveSessionCounter = readSessionCounter(runtime, chainSelector, evmConfig)
  runtime.log(`Live sessionCounter: ${liveSessionCounter}`)

  if (liveSessionCounter === BigInt(0)) {
    return skip("No session has been started yet (sessionCounter = 0). Skipping distribution.")
  }

  // 2. Find the target session: the latest ended, non-distributed session.
  //    Start from the live session and scan backwards up to 3 sessions.
  const targetSession = findDistributionTarget(runtime, chainSelector, evmConfig, liveSessionCounter)

  if (!targetSession) {
    return skip("No ended, non-distributed session found. Nothing to distribute.")
  }

  runtime.log(
    `Target session ${targetSession.sessionId} — isActive: ${targetSession.isActive}, distributed: ${targetSession.distributed}, prizePool: ${targetSession.prizePool}, players: ${targetSession.paidPlayerCount}, endTime: ${targetSession.endTime}`
  )

  if (targetSession.distributed) {
    return skip(`Prizes already distributed for session ${targetSession.sessionId}`)
  }

  if (targetSession.prizePool === BigInt(0)) {
    return skip(`No prize pool for session ${targetSession.sessionId} (0, players: ${targetSession.paidPlayerCount}).`)
  }

  // 3. Fetch rankings (from API or on-chain) and sync if needed
  let scoreSyncAttempted = false
  let scoreSyncSucceeded = false

  let hasScores = verifyScoresExistForSession(runtime, chainSelector, evmConfig, targetSession.sessionId)

  if (!hasScores) {
    runtime.log(`No on-chain scores for session ${targetSession.sessionId}. Attempting CRE rankings sync...`)
    scoreSyncAttempted = true
    const rankingsSync = syncScoresFromRankingsApi(runtime, chainSelector, evmConfig, targetSession.sessionId)
    if (rankingsSync.synced) {
      runtime.log("Rankings-based on-chain score sync submitted; re-checking synced player scores")
      hasScores = verifyScoresForPlayersInSession(
        runtime,
        chainSelector,
        evmConfig,
        targetSession.sessionId,
        rankingsSync.addresses
      )
    }
  }

  if (!hasScores) {
    runtime.log(`Rankings sync unavailable or incomplete. Attempting HTTP score sync fallback...`)
    scoreSyncAttempted = true
    scoreSyncSucceeded = syncScoresFromApp(runtime, targetSession.sessionId)
    if (scoreSyncSucceeded) {
      runtime.log("HTTP score sync succeeded; re-checking on-chain scores once")
      hasScores = verifyScoresExistForSession(runtime, chainSelector, evmConfig, targetSession.sessionId)
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
      targetSessionId: targetSession.sessionId.toString(),
      reason: `No player scores on-chain for session ${targetSession.sessionId}. Sync scores before distribution.`,
    }
  }

  // 4. Fetch the rankings data (addresses + scores) to pass to syncAndDistributeForSession
  const rankings = fetchRankings(runtime, chainSelector, evmConfig, targetSession.sessionId)
  if (rankings.addresses.length === 0) {
    return {
      action: "skipped",
      distributionExecuted: false,
      scoreSyncAttempted,
      scoreSyncSucceeded,
      targetSessionId: targetSession.sessionId.toString(),
      reason: `No rankings data available for session ${targetSession.sessionId}.`,
    }
  }

  // 5. Call syncAndDistributeForSession(sessionId, addresses, scores)
  runtime.log(`All conditions met. Executing syncAndDistributeForSession(${targetSession.sessionId}, ${rankings.addresses.length} players)...`)

  try {
    const txHash = callSyncAndDistributeForSession(
      runtime,
      chainSelector,
      evmConfig,
      targetSession.sessionId,
      rankings.addresses,
      rankings.scores
    )

    const receipt = verifyDistributionReceipt(
      runtime,
      chainSelector,
      evmConfig,
      targetSession.sessionId,
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
        targetSessionId: targetSession.sessionId.toString(),
      }
    }

    if (receipt.status === "pending") {
      runtime.log(`Distribution tx submitted but not finalized yet: ${txHash}`)
      return {
        action: "skipped",
        distributionExecuted: false,
        reason: `Distribution tx ${txHash} submitted; awaiting on-chain finalization. Weekly cron will re-check.`,
        txHash,
        receiptStatus: receipt.status,
        scoreSyncAttempted,
        scoreSyncSucceeded,
        targetSessionId: targetSession.sessionId.toString(),
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
      targetSessionId: targetSession.sessionId.toString(),
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
      targetSessionId: targetSession.sessionId.toString(),
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function skip(reason: string): DistributionResult {
  return { action: "skipped", distributionExecuted: false, reason }
}

function readSessionCounter(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig
): bigint {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  const call = encodeFunctionData({ abi: SESSION_COUNTER_ABI, functionName: "sessionCounter" })
  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: call }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  return decodeFunctionResult({
    abi: SESSION_COUNTER_ABI,
    functionName: "sessionCounter",
    data: bytesToHex(result.data),
  }) as bigint
}

function readSessionInfo(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint
): SessionInfo {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  const call = encodeFunctionData({
    abi: GET_SESSION_INFO_ABI,
    functionName: "getSessionInfo",
    args: [sessionId],
  })
  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: call }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const decoded = decodeFunctionResult({
    abi: GET_SESSION_INFO_ABI,
    functionName: "getSessionInfo",
    data: bytesToHex(result.data),
  }) as [boolean, boolean, bigint, bigint, bigint, bigint]

  return {
    sessionId,
    isActive: decoded[0],
    distributed: decoded[1],
    startTime: decoded[2],
    endTime: decoded[3],
    prizePool: decoded[4],
    paidPlayerCount: decoded[5],
    trialPlayerCount: BigInt(0),
  }
}

/**
 * Find the latest ended, non-distributed session.
 * Scans backwards from the live sessionCounter up to 3 sessions.
 */
function findDistributionTarget(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  liveSessionCounter: bigint
): SessionInfo | null {
  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  const scanDepth = 3

  for (let offset = 0; offset < scanDepth; offset++) {
    const sessionId = liveSessionCounter - BigInt(offset)
    if (sessionId <= BigInt(0)) break

    const info = readSessionInfo(runtime, chainSelector, evmConfig, sessionId)
    runtime.log(
      `Scanned session ${sessionId}: isActive=${info.isActive}, distributed=${info.distributed}, endTime=${info.endTime}, prizePool=${info.prizePool}`
    )

    // Session must have ended and not be distributed
    if (!info.distributed && currentTime > info.endTime) {
      return info
    }
  }

  return null
}

function verifyScoresExistForSession(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint
): boolean {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  // Single RPC call to check if any player in the session has a non-zero score.
  // This replaces up to MAX_PLAYERS sequential getPlayerScoreForSession calls.
  const call = encodeFunctionData({
    abi: HAS_ANY_SCORES_FOR_SESSION_ABI,
    functionName: "hasAnyScoresForSession",
    args: [sessionId],
  })
  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: call }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const hasScores = decodeFunctionResult({
    abi: HAS_ANY_SCORES_FOR_SESSION_ABI,
    functionName: "hasAnyScoresForSession",
    data: bytesToHex(result.data),
  }) as boolean

  if (!hasScores) {
    runtime.log(`No scores found in session ${sessionId}`)
  }
  return hasScores
}

function verifyScoresForPlayersInSession(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint,
  players: `0x${string}`[]
): boolean {
  if (players.length === 0) return false

  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  for (const player of players) {
    const call = encodeFunctionData({
      abi: GET_PLAYER_SCORE_FOR_SESSION_ABI,
      functionName: "getPlayerScoreForSession",
      args: [sessionId, player],
    })
    const result = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: call }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()
    const score = decodeFunctionResult({
      abi: GET_PLAYER_SCORE_FOR_SESSION_ABI,
      functionName: "getPlayerScoreForSession",
      data: bytesToHex(result.data),
    }) as bigint

    if (score > BigInt(0)) {
      runtime.log(`Player ${player} has score ${score} in session ${sessionId}`)
      return true
    }
  }

  runtime.log(`Checked ${players.length} players in session ${sessionId} — no scores found`)
  return false
}

/**
 * Fetch rankings from the API and return addresses + scores.
 * Also submits them on-chain via submitScoresForSession if needed.
 */
function fetchRankings(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint
): { addresses: `0x${string}`[]; scores: bigint[] } {
  // Try the rankings API first
  const rankingsSync = syncScoresFromRankingsApi(runtime, chainSelector, evmConfig, sessionId)
  if (rankingsSync.synced && rankingsSync.addresses.length > 0) {
    return { addresses: rankingsSync.addresses, scores: rankingsSync.scores }
  }

  // Fall back to reading on-chain scores for all players in the session
  return readOnChainScores(runtime, chainSelector, evmConfig, sessionId)
}

function readOnChainScores(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint
): { addresses: `0x${string}`[]; scores: bigint[] } {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  const contractAddress = evmConfig.contractAddress as `0x${string}`

  const playersCall = encodeFunctionData({
    abi: GET_CURRENT_PLAYERS_FOR_SESSION_ABI,
    functionName: "getCurrentPlayersForSession",
    args: [sessionId],
  })
  const playersResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: playersCall }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()
  const players = decodeFunctionResult({
    abi: GET_CURRENT_PLAYERS_FOR_SESSION_ABI,
    functionName: "getCurrentPlayersForSession",
    data: bytesToHex(playersResult.data),
  }) as `0x${string}`[]

  const addresses: `0x${string}`[] = []
  const scores: bigint[] = []

  for (const player of players) {
    const call = encodeFunctionData({
      abi: GET_PLAYER_SCORE_FOR_SESSION_ABI,
      functionName: "getPlayerScoreForSession",
      args: [sessionId, player],
    })
    const result = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: contractAddress, data: call }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()
    const score = decodeFunctionResult({
      abi: GET_PLAYER_SCORE_FOR_SESSION_ABI,
      functionName: "getPlayerScoreForSession",
      data: bytesToHex(result.data),
    }) as bigint

    if (score > BigInt(0)) {
      addresses.push(player)
      scores.push(score)
    }
  }

  return { addresses, scores }
}

function syncScoresFromRankingsApi(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint
): { synced: boolean; addresses: `0x${string}`[]; scores: bigint[] } {
  const apiUrl = runtime.config.sessionRankingsApiUrl?.trim()
  if (!apiUrl) {
    runtime.log("sessionRankingsApiUrl not configured; skipping rankings sync")
    return { synced: false, addresses: [], scores: [] }
  }

  const fetchRankings = (nodeRuntime: NodeRuntime<Config>): string => {
    const httpClient = new cre.capabilities.HTTPClient()
    const resp = httpClient
      .sendRequest(nodeRuntime, {
        url: apiUrl,
        method: "GET",
        headers: { Accept: "application/json" },
      })
      .result()

    const status = resp.statusCode ?? 0
    nodeRuntime.log(`Session rankings HTTP status: ${status}`)
    if (status < 200 || status >= 300) return ""

    return new TextDecoder().decode(resp.body ?? new Uint8Array())
  }

  const body = runtime.runInNodeMode(fetchRankings, consensusMedianAggregation())().result()
  if (!body) return { synced: false, addresses: [], scores: [] }

  let parsed: { players?: { address: string; score: number }[] }
  try {
    parsed = JSON.parse(body) as { players?: { address: string; score: number }[] }
  } catch {
    runtime.log("Failed to parse session rankings JSON")
    return { synced: false, addresses: [], scores: [] }
  }

  // Defensive: JSON.parse("null") returns null — guard before property access
  if (!parsed || typeof parsed !== "object") {
    runtime.log("Session rankings API returned invalid JSON (not an object)")
    return { synced: false, addresses: [], scores: [] }
  }

  const playerEntries = Array.isArray(parsed.players) ? parsed.players : []
  if (playerEntries.length === 0) {
    runtime.log("Session rankings API returned no scored players")
    return { synced: false, addresses: [], scores: [] }
  }

  const addresses = playerEntries.map((e) => e.address as `0x${string}`)
  const scores = playerEntries.map((e) => BigInt(e.score))

  // Submit scores on-chain for this specific session
  try {
    callSubmitScoresForSession(runtime, chainSelector, evmConfig, sessionId, addresses, scores)
    return { synced: true, addresses, scores }
  } catch (error) {
    runtime.log(
      `Rankings on-chain submit failed: ${error instanceof Error ? error.message : String(error)}`
    )
    return { synced: false, addresses: [], scores: [] }
  }
}

function callSubmitScoresForSession(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint,
  addresses: `0x${string}`[],
  scores: bigint[]
): string {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  const callData = encodeFunctionData({
    abi: SUBMIT_SCORES_FOR_SESSION_ABI,
    functionName: "submitScoresForSession",
    args: [sessionId, addresses, scores],
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
      gasConfig: { gasLimit: evmConfig.gasLimit },
    })
    .result()

  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
  runtime.log(`submitScoresForSession(${sessionId}) tx submitted: ${txHash}`)
  return txHash
}

function callSyncAndDistributeForSession(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  sessionId: bigint,
  addresses: `0x${string}`[],
  scores: bigint[]
): string {
  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  const callData = encodeFunctionData({
    abi: SYNC_AND_DISTRIBUTE_FOR_SESSION_ABI,
    functionName: "syncAndDistributeForSession",
    args: [sessionId, addresses, scores],
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
      gasConfig: { gasLimit: evmConfig.gasLimit },
    })
    .result()

  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
  runtime.log(`syncAndDistributeForSession(${sessionId}) tx submitted: ${txHash}`)
  return txHash
}

function syncScoresFromApp(runtime: Runtime<Config>, sessionId: bigint): boolean {
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
        body: new TextEncoder().encode(JSON.stringify({ sessionId: sessionId.toString() })),
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
  sessionId: bigint,
  txHash: string
): { status: "success" | "reverted" | "pending" | "unknown" } {
  // Check the real distributed flag on-chain
  const sessionInfo = readSessionInfo(runtime, chainSelector, evmConfig, sessionId)
  if (sessionInfo.distributed) {
    runtime.log(`Session ${sessionId} marked as distributed — confirmed via on-chain state`)
    return { status: "success" }
  }

  // Fall back to receipt check
  const evmClient = new cre.capabilities.EVMClient(chainSelector)
  try {
    const receiptReply = evmClient
      .getTransactionReceipt(runtime, { hash: txHash })
      .result()

    const receipt = receiptReply as { receipt?: { status?: number | string }; status?: number | string }
    const rawStatus = receipt.receipt?.status ?? receipt.status
    if (rawStatus !== undefined && rawStatus !== null) {
      const statusNum = typeof rawStatus === "string" ? parseInt(rawStatus, 16) : Number(rawStatus)
      if (statusNum === 1) return { status: "success" }
      if (statusNum === 0) return { status: "reverted" }
    }
  } catch (error) {
    runtime.log(`Receipt check failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  runtime.log("Distribution tx not finalized in this run; weekly cron will re-check session state")
  return { status: "pending" }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}

main()