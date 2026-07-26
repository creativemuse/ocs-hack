import { formatUnits, createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { base } from 'viem/chains';
import { resolveBaseRpcUrl } from '@/lib/blockchain/baseRpc';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import {
  readOnChainPlayerScores,
} from '@/lib/blockchain/onChainScoreSync';
import { rpcBatchEthCall } from '@/lib/game/weeklyLeaderboard';

const KEYSTONE_FORWARDER = '0xF8344CFd5c43616a4366C34E3EEE75af79a74482';

export type CreSkipReason =
  | 'none_ready_to_distribute'
  | 'no_session_started'
  | 'session_still_active'
  | 'prizes_already_distributed'
  | 'empty_prize_pool'
  | 'no_on_chain_scores';

export type WeeklyPayoutDiagnostics = {
  contract: string;
  sessionCounter: number;
  isSessionActive: boolean;
  entryFeeUsdc: string;
  lastSessionTime: string;
  sessionIntervalSeconds: number;
  sessionEndTime: string;
  prizePoolUsdc: string;
  chainlinkOracle: string;
  oracleMatchesKeystone: boolean;
  players: { address: string; score: string }[];
  creSkipReason: CreSkipReason;
  creWouldExecute: boolean;
};

const formatTimestamp = (ts: bigint): string => {
  if (ts === BigInt(0)) return 'never';
  return new Date(Number(ts) * 1000).toISOString();
};

export const evaluateCreSkip = (params: {
  sessionCounter: bigint;
  isSessionActive: boolean;
  distributed: boolean;
  prizePool: bigint;
  endTime: bigint;
  hasOnChainScores: boolean;
  now: bigint;
}): CreSkipReason => {
  const { sessionCounter, isSessionActive, distributed, prizePool, endTime, hasOnChainScores, now } = params;
  const isSessionEnded = !isSessionActive || now > endTime;

  if (sessionCounter === BigInt(0)) return 'no_session_started';
  if (distributed) return 'prizes_already_distributed';
  if (!isSessionEnded) return 'session_still_active';
  if (prizePool === BigInt(0)) return 'empty_prize_pool';
  if (!hasOnChainScores) return 'no_on_chain_scores';
  return 'none_ready_to_distribute';
};

type DiagnosticsViewFunction =
  | 'isSessionActive'
  | 'sessionCounter'
  | 'entryFee'
  | 'lastSessionTime'
  | 'sessionInterval'
  | 'getSessionInfo'
  | 'getCurrentPlayers'
  | 'chainlinkOracle';

const decodeView = <T>(functionName: DiagnosticsViewFunction, data: string | undefined): T => {
  if (!data || data === '0x') {
    throw new Error(`No data returned for function ${functionName}`);
  }

  return decodeFunctionResult({
    abi: TRIVIA_ABI,
    functionName,
    data: data as `0x${string}`,
  }) as T;
};

/** Prefer configured RPC (e.g. Alchemy via BASE_RPC_URL); fall back to public Base. */
const RPC_FALLBACKS = [resolveBaseRpcUrl(), 'https://mainnet.base.org'].filter(
  (url, index, list): url is string => Boolean(url) && list.indexOf(url) === index,
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readDiagnosticsViaBatch = async (rpcUrl: string) => {
  // First fetch sessionCounter (needed for getSessionInfo arg)
  const counterData = encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'sessionCounter' });
  const counterHex = await rpcBatchEthCall([counterData], rpcUrl);
  const sessionCounter = decodeFunctionResult({
    abi: TRIVIA_ABI,
    functionName: 'sessionCounter',
    data: counterHex[0] as `0x${string}`,
  }) as unknown as bigint;

  const callData = [
    encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'isSessionActive' }),
    encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'entryFee' }),
    encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'lastSessionTime' }),
    encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'sessionInterval' }),
    encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'getSessionInfo', args: [sessionCounter] }),
    encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'getCurrentPlayers' }),
    encodeFunctionData({ abi: TRIVIA_ABI, functionName: 'chainlinkOracle' }),
  ] as `0x${string}`[];

  const results = await rpcBatchEthCall(callData, rpcUrl);

  const sessionInfo = decodeView<readonly [boolean, boolean, bigint, bigint, bigint, bigint]>('getSessionInfo', results[4]);

  return {
    isSessionActive: decodeView<boolean>('isSessionActive', results[0]),
    sessionCounter,
    entryFee: decodeView<bigint>('entryFee', results[1]),
    lastSessionTime: decodeView<bigint>('lastSessionTime', results[2]),
    sessionInterval: decodeView<bigint>('sessionInterval', results[3]),
    prizePool: sessionInfo[4],
    distributed: sessionInfo[1],
    playerList: decodeView<`0x${string}`[]>('getCurrentPlayers', results[5]),
    chainlinkOracle: decodeView<string>('chainlinkOracle', results[6]),
  };
};

const readDiagnosticsSequential = async (rpcUrl: string) => {
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const contract = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;

  const read = async <T>(functionName: DiagnosticsViewFunction, args?: readonly unknown[]) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await sleep(1000 * attempt);
        return (await publicClient.readContract({
          address: contract,
          abi: TRIVIA_ABI,
          functionName,
          args: args as never,
        })) as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('rate limit') || attempt === 2) {
          throw error;
        }
      }
    }
    throw new Error(`Failed to read ${functionName}`);
  };

  const isSessionActive = await read<boolean>('isSessionActive');
  const sessionCounter = await read<bigint>('sessionCounter');
  const entryFee = await read<bigint>('entryFee');
  const lastSessionTime = await read<bigint>('lastSessionTime');
  const sessionInterval = await read<bigint>('sessionInterval');
  const sessionInfo = await read<readonly [boolean, boolean, bigint, bigint, bigint, bigint]>('getSessionInfo', [sessionCounter]);
  const playerList = await read<`0x${string}`[]>('getCurrentPlayers');
  const chainlinkOracle = await read<string>('chainlinkOracle');

  return {
    isSessionActive,
    sessionCounter,
    entryFee,
    lastSessionTime,
    sessionInterval,
    prizePool: sessionInfo[4],
    distributed: sessionInfo[1],
    playerList,
    chainlinkOracle,
  };
};

const readOnChainSessionState = async (): Promise<{
  rpcUrl: string;
  isSessionActive: boolean;
  sessionCounter: bigint;
  entryFee: bigint;
  lastSessionTime: bigint;
  sessionInterval: bigint;
  prizePool: bigint;
  distributed: boolean;
  playerList: `0x${string}`[];
  chainlinkOracle: string;
}> => {
  let lastError: unknown;
  for (const rpcUrl of RPC_FALLBACKS) {
    try {
      const state = await readDiagnosticsViaBatch(rpcUrl);
      return { rpcUrl, ...state };
    } catch (batchError) {
      console.warn(
        `Batch diagnostics failed for ${rpcUrl}, falling back to sequential:`,
        batchError,
      );
      try {
        const state = await readDiagnosticsSequential(rpcUrl);
        return { rpcUrl, ...state };
      } catch (sequentialError) {
        lastError = sequentialError;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All RPC endpoints failed');
};

/** On-chain session diagnostics with RPC fallbacks for public endpoint rate limits. */
export const fetchWeeklyPayoutDiagnostics = async (): Promise<WeeklyPayoutDiagnostics> => {
  const contract = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;
  const {
    rpcUrl,
    isSessionActive,
    sessionCounter,
    entryFee,
    lastSessionTime,
    sessionInterval,
    prizePool,
    playerList,
    chainlinkOracle,
    distributed,
  } = await readOnChainSessionState();

  const endTime = lastSessionTime + sessionInterval;
  const now = BigInt(Math.floor(Date.now() / 1000));

  let hasOnChainScores = false;
  const playerScores: { address: string; score: string }[] = [];

  if (playerList.length > 0) {
    const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
    const onChain = await readOnChainPlayerScores(publicClient, playerList);
    for (const entry of onChain) {
      if (entry.score > BigInt(0)) hasOnChainScores = true;
      playerScores.push({ address: entry.address, score: entry.score.toString() });
    }
  }

  const creSkipReason = evaluateCreSkip({
    sessionCounter,
    isSessionActive,
    distributed,
    prizePool,
    endTime,
    hasOnChainScores,
    now,
  });

  const oracle = chainlinkOracle.toLowerCase();
  const expected = KEYSTONE_FORWARDER.toLowerCase();

  return {
    contract,
    sessionCounter: Number(sessionCounter),
    isSessionActive,
    entryFeeUsdc: formatUnits(entryFee, 6),
    lastSessionTime: formatTimestamp(lastSessionTime),
    sessionIntervalSeconds: Number(sessionInterval),
    sessionEndTime: formatTimestamp(endTime),
    prizePoolUsdc: formatUnits(prizePool, 6),
    chainlinkOracle,
    oracleMatchesKeystone: oracle === expected,
    players: playerScores,
    creSkipReason,
    creWouldExecute: creSkipReason === 'none_ready_to_distribute',
  };
};
