import {
  getTimestampMicros,
  isPaidPlayerType,
  isSpacetimeHttpConfigured,
  mapSqlGameSessionRow,
  mapSqlPlayerRow,
  querySqlSafe,
} from '@/lib/apis/spacetimeHttp';
import { fetchWeeklyScoresFromChain, fetchWeeklyScoresFromChainForSession } from '@/lib/game/weeklyLeaderboard';

export type PlayerWeeklyScore = {
  address: `0x${string}`;
  score: bigint;
};

export type WeeklyScoresLookupOptions = {
  /** Skip extra RPC batch when caller already read sessionCounter from chain. */
  sessionCounter?: number;
  chainScores?: Map<string, number>;
  /** Skip SpacetimeDB when scores are supplied via overrides (CLI unblock). */
  skipSpacetime?: boolean;
};

/**
 * Resolve weekly scores for on-chain session players from SpacetimeDB (server cache)
 * plus paid game_sessions for the current sessionCounter. On-chain scores win when present.
 *
 * When `options.sessionCounter` is provided, queries target that specific session
 * instead of the live on-chain sessionCounter. This is critical for CRE distribution
 * workflows that operate on closed sessions after rollover.
 */
export const getWeeklyScoresForPlayers = async (
  playerAddresses: readonly `0x${string}`[],
  options: WeeklyScoresLookupOptions = {},
): Promise<{ sessionCounter: number; scores: PlayerWeeklyScore[] }> => {
  let sessionCounter = options.sessionCounter;
  let chainScores = options.chainScores ?? new Map<string, number>();

  if (sessionCounter === undefined) {
    const chain = await fetchWeeklyScoresFromChain();
    sessionCounter = chain.sessionCounter;
    chainScores = chain.chainScores;
  } else if (chainScores.size === 0) {
    // When a specific sessionCounter is passed but no chain scores supplied,
    // fetch on-chain scores for that specific session.
    const chain = await fetchWeeklyScoresFromChainForSession(sessionCounter);
    chainScores = chain;
  }

  const sessionId = BigInt(sessionCounter);
  const gameId = sessionCounter.toString();

  const playersByWallet = new Map<string, ReturnType<typeof mapSqlPlayerRow>>();
  const sessionScores = new Map<string, { score: number; startedAt: number }>();

  if (!options.skipSpacetime && isSpacetimeHttpConfigured()) {
    // SpacetimeDB SQL does not support IN lists, so fetch players by session
    // and filter to the requested wallets in-memory.
    const playerRows = await querySqlSafe<Record<string, unknown>>(
      `SELECT * FROM players WHERE weekly_session_id = ${sessionCounter}`,
    );
    const requestedWallets = new Set(playerAddresses.map((a) => a.toLowerCase()));
    for (const row of playerRows) {
      const player = mapSqlPlayerRow(row);
      if (requestedWallets.has(player.walletAddress.toLowerCase())) {
        playersByWallet.set(player.walletAddress.toLowerCase(), player);
      }
    }

    const sessionRows = await querySqlSafe<Record<string, unknown>>(
      `SELECT * FROM game_sessions WHERE game_id = '${gameId.replace(/'/g, "''")}'`,
    );
    for (const row of sessionRows) {
      const session = mapSqlGameSessionRow(row);
      if (session.gameId !== gameId || !session.walletAddress) continue;
      if (!isPaidPlayerType(session.playerType)) continue;
      const wallet = session.walletAddress.toLowerCase();
      const startedAt = getTimestampMicros(session.startedAt);
      const prev = sessionScores.get(wallet);
      if (!prev || startedAt >= prev.startedAt) {
        sessionScores.set(wallet, { score: session.score, startedAt });
      }
    }
  }

  const scores: PlayerWeeklyScore[] = playerAddresses.map((address) => {
    const wallet = address.toLowerCase();
    const onChain = chainScores.get(wallet) ?? 0;
    if (onChain > 0) {
      return { address, score: BigInt(onChain) };
    }

    const player = playersByWallet.get(wallet);
    if (player && player.weeklySessionId === sessionId) {
      const weekly =
        player.weeklyBestScore > 0 ? player.weeklyBestScore : player.bestScore;
      if (weekly > 0) {
        return { address, score: BigInt(weekly) };
      }
    }

    const sessionScore = sessionScores.get(wallet)?.score ?? 0;
    return { address, score: BigInt(sessionScore) };
  });

  return { sessionCounter, scores };
};

export const hasResolvableWeeklyScores = (scores: readonly PlayerWeeklyScore[]): boolean =>
  scores.some((entry) => entry.score > BigInt(0));
