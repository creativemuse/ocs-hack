import { spacetimeClient } from '@/lib/apis/spacetime';
import { fetchWeeklyScoresFromChain } from '@/lib/game/weeklyLeaderboard';

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
  }

  if (!options.skipSpacetime && process.env.SPACETIME_HOST && process.env.SPACETIME_MODULE) {
    await spacetimeClient.ensurePlayerDataReady();
  }

  const sessionId = BigInt(sessionCounter);
  const gameId = sessionCounter.toString();
  const playersByWallet = new Map(
    spacetimeClient.isConfigured()
      ? spacetimeClient.getAllPlayers().map((p) => [p.walletAddress.toLowerCase(), p])
      : [],
  );

  const sessionScores = new Map<string, { score: number; startedAt: number }>();
  if (spacetimeClient.isConfigured()) {
    const allSessions = spacetimeClient.getAllGameSessions();
    for (const session of allSessions) {
      if (session.gameId !== gameId || !session.walletAddress) continue;
      if (session.playerType?.tag !== 'Paid') continue;
      const wallet = session.walletAddress.toLowerCase();
      const startedAt = session.startedAt?.microsSinceUnixEpoch
        ? Number(session.startedAt.microsSinceUnixEpoch)
        : 0;
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
