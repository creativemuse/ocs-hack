import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { resolveBaseRpcUrl } from '@/lib/blockchain/baseRpc';

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
  resolveBaseRpcUrl();

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rpcEthCall = async (data: `0x${string}`, rpcUrl: string = BASE_RPC_URL): Promise<string> => {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await sleep(800 * attempt);
    }

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: TRIVIA_CONTRACT_ADDRESS, data }, 'latest'],
      }),
      cache: 'no-store',
    });

    const json = (await res.json()) as JsonRpcResponse;
    if (json.error) {
      const message = json.error.message || 'RPC eth_call failed';
      if (message.includes('rate limit') && attempt < 3) {
        continue;
      }
      throw new Error(message);
    }

    return json.result ?? '0x';
  }

  throw new Error('RPC eth_call failed after retries');
};

/** Batch multiple eth_call requests into a single HTTP round-trip. */
export const rpcBatchEthCall = async (
  callData: `0x${string}`[],
  rpcUrl: string = BASE_RPC_URL,
): Promise<string[]> => {
  if (callData.length === 0) return [];

  if (callData.length === 1) {
    return [await rpcEthCall(callData[0], rpcUrl)];
  }

  try {
    const payload = callData.map((data, index) => ({
      jsonrpc: '2.0',
      id: index + 1,
      method: 'eth_call',
      params: [{ to: TRIVIA_CONTRACT_ADDRESS, data }, 'latest'],
    }));

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('rate limit')) {
      throw error;
    }
  }

  const results: string[] = [];
  for (const data of callData) {
    results.push(await rpcEthCall(data, rpcUrl));
  }
  return results;
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

/**
 * Merge on-chain scores with SpacetimeDB weekly session scores.
 * Weekly ranking uses each player's **latest** score (not best-of-week).
 * On-chain scores are authoritative when present; Spacetime fills gaps while
 * a submission is still propagating.
 */
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
    if (merged.has(wallet)) {
      const existing = merged.get(wallet)!;
      merged.set(wallet, {
        ...existing,
        username: player.username ?? existing.username,
        avatarUrl: player.avatarUrl ?? existing.avatarUrl,
        totalEarnings: player.totalEarnings ?? existing.totalEarnings,
      });
      continue;
    }

    merged.set(wallet, {
      walletAddress: wallet,
      username: player.username ?? undefined,
      avatarUrl: player.avatarUrl ?? undefined,
      bestScore: player.weeklyBestScore,
      totalEarnings: player.totalEarnings,
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

/** Rank a wallet using its latest submitted score for the current week. */
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
      bestScore: score,
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

/** True when this run took or holds weekly #1 (not merely re-submitted a lower score). */
export const isNewWeeklyLeader = (
  entries: WeeklyLeaderboardEntry[],
  walletAddress: string,
  score: number,
): boolean => {
  if (score <= 0) return false;

  const normalized = walletAddress.toLowerCase();
  const previousLeaderScore = entries[0]?.bestScore ?? 0;
  const rank = computeRankForScore(entries, walletAddress, score);

  return rank === 1 && score >= previousLeaderScore;
};

/** True when the weekly board has no entries yet (first score of the week). */
export const isFirstScoreOnEmptyBoard = (
  entries: WeeklyLeaderboardEntry[],
): boolean => entries.length === 0;

/** Parse on-chain session id strings safely. */
export const parseSessionIdNumeric = (id: string | undefined): number => {
  if (!id?.trim()) return 0;
  const parsed = Number(id.trim());
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

/**
 * Resolve the session id to use for weekly score persistence.
 * Trusts the entry token / score receipt unless it is missing; only falls back to
 * the live counter when no token session id is available. This prevents a player's
 * score from being attributed to a later session if the on-chain counter advanced
 * while they were still finishing their paid run.
 */
export const resolveAuthoritativeSessionId = (
  tokenSessionId: string,
  liveSessionCounter: number,
): string => {
  const tokenNumeric = parseSessionIdNumeric(tokenSessionId);
  if (tokenNumeric > 0) {
    return String(tokenNumeric);
  }
  return String(liveSessionCounter > 0 ? liveSessionCounter : 0);
};
