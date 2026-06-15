import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

export interface WeeklyLeaderboardEntry {
  walletAddress: string;
  username?: string;
  avatarUrl?: string;
  bestScore: number;
  totalEarnings?: number;
  sessionCounter: number;
}

export interface SpacetimePlayerWeeklyRow {
  walletAddress: string;
  username?: string | null;
  avatarUrl?: string | null;
  weeklySessionId: bigint;
  weeklyBestScore: number;
  totalEarnings?: number;
}

type JsonRpcResponse = {
  id: number;
  result?: string;
  error?: { message: string };
};

const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  'https://mainnet.base.org';

const normalizeRpcBatchResponse = (json: unknown): JsonRpcResponse[] => {
  if (Array.isArray(json)) return json as JsonRpcResponse[];
  return [json as JsonRpcResponse];
};

const safeBigIntFromHex = (hex: string | undefined): bigint => {
  if (!hex || hex === '0x') return BigInt(0);
  try {
    return BigInt(hex);
  } catch {
    return BigInt(0);
  }
};

/** Batch multiple eth_call requests into a single HTTP round-trip. */
export const rpcBatchEthCall = async (
  callData: `0x${string}`[],
  rpcUrl: string = BASE_RPC_URL,
): Promise<string[]> => {
  if (callData.length === 0) return [];

  const payload = callData.map((data, index) => ({
    jsonrpc: '2.0',
    id: index + 1,
    method: 'eth_call',
    params: [{ to: TRIVIA_CONTRACT_ADDRESS, data }, 'latest'],
  }));

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
    cache: 'no-store',
  });

  const json = await res.json();
  const items = normalizeRpcBatchResponse(json);
  const sorted = [...items].sort((a, b) => a.id - b.id);

  return sorted.map((item, index) => {
    if (item.error) {
      throw new Error(item.error.message || `RPC batch call ${index + 1} failed`);
    }
    return item.result ?? '0x';
  });
};

export const fetchWeeklyScoresFromChain = async (): Promise<{
  sessionCounter: number;
  chainScores: Map<string, number>;
}> => {
  const sessionCounterData = encodeFunctionData({
    abi: TRIVIA_ABI,
    functionName: 'sessionCounter',
  });
  const playersListData = encodeFunctionData({
    abi: TRIVIA_ABI,
    functionName: 'getCurrentPlayers',
  });

  const [sessionCounterRaw, playersRaw] = await rpcBatchEthCall([
    sessionCounterData,
    playersListData,
  ]);
  const sessionCounter = Number(safeBigIntFromHex(sessionCounterRaw));

  let players: `0x${string}`[] = [];
  if (playersRaw && playersRaw !== '0x') {
    players = decodeFunctionResult({
      abi: TRIVIA_ABI,
      functionName: 'getCurrentPlayers',
      data: playersRaw as `0x${string}`,
    }) as `0x${string}`[];
  }

  const chainScores = new Map<string, number>();
  if (players.length === 0) {
    return { sessionCounter, chainScores };
  }

  const scoreCallData = players.map((player) =>
    encodeFunctionData({
      abi: TRIVIA_ABI,
      functionName: 'getPlayerScore',
      args: [player],
    }),
  );

  const scoreRaws = await rpcBatchEthCall(scoreCallData);

  players.forEach((player, index) => {
    const wallet = player.toLowerCase();
    const score = Number(safeBigIntFromHex(scoreRaws[index]));
    if (score > 0) {
      chainScores.set(wallet, score);
    }
  });

  return { sessionCounter, chainScores };
};

/** Merge on-chain scores with SpacetimeDB weekly session scores. */
export const mergeWeeklyLeaderboardEntries = (
  sessionCounter: number,
  chainScores: Map<string, number>,
  spacetimePlayers: SpacetimePlayerWeeklyRow[],
  limit: number,
): WeeklyLeaderboardEntry[] => {
  const sessionId = BigInt(sessionCounter);
  const merged = new Map<string, WeeklyLeaderboardEntry>();

  for (const [wallet, score] of chainScores) {
    merged.set(wallet, {
      walletAddress: wallet,
      bestScore: score,
      sessionCounter,
    });
  }

  for (const player of spacetimePlayers) {
    if (player.weeklySessionId !== sessionId || player.weeklyBestScore <= 0) {
      continue;
    }
    const wallet = player.walletAddress.toLowerCase();
    const existing = merged.get(wallet);
    const bestScore = Math.max(existing?.bestScore ?? 0, player.weeklyBestScore);
    merged.set(wallet, {
      walletAddress: wallet,
      username: player.username ?? existing?.username,
      avatarUrl: player.avatarUrl ?? existing?.avatarUrl,
      bestScore,
      totalEarnings: player.totalEarnings ?? existing?.totalEarnings,
      sessionCounter,
    });
  }

  return [...merged.values()]
    .filter((entry) => entry.bestScore > 0)
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, limit);
};

export const enrichWeeklyEntriesWithMetadata = (
  entries: WeeklyLeaderboardEntry[],
  spacetimePlayers: SpacetimePlayerWeeklyRow[],
  limit: number,
): WeeklyLeaderboardEntry[] => {
  const playersByWallet = new Map(
    spacetimePlayers.map((p) => [p.walletAddress.toLowerCase(), p]),
  );

  return entries.slice(0, limit).map((entry) => {
    const player = playersByWallet.get(entry.walletAddress.toLowerCase());
    return {
      ...entry,
      username: player?.username ?? entry.username ?? undefined,
      avatarUrl: player?.avatarUrl ?? entry.avatarUrl ?? undefined,
      totalEarnings: player?.totalEarnings ?? entry.totalEarnings,
    };
  });
};

export const computeRankForScore = (
  entries: WeeklyLeaderboardEntry[],
  walletAddress: string,
  score: number,
): number => {
  const normalized = walletAddress.toLowerCase();
  const withCurrent = [...entries];
  const existingIdx = withCurrent.findIndex(
    (e) => e.walletAddress.toLowerCase() === normalized,
  );
  if (existingIdx >= 0) {
    withCurrent[existingIdx] = {
      ...withCurrent[existingIdx],
      bestScore: Math.max(withCurrent[existingIdx].bestScore, score),
    };
  } else if (score > 0) {
    withCurrent.push({
      walletAddress: normalized,
      bestScore: score,
      sessionCounter: entries[0]?.sessionCounter ?? 0,
    });
  }
  withCurrent.sort((a, b) => b.bestScore - a.bestScore);
  const rankIdx = withCurrent.findIndex(
    (e) => e.walletAddress.toLowerCase() === normalized,
  );
  return rankIdx >= 0 ? rankIdx + 1 : withCurrent.length + 1;
};
