import { spacetimeClient } from '@/lib/apis/spacetime';
import type { Player } from '@/lib/spacetime/database';
import {
  type WeeklyLeaderboardEntry,
  fetchWeeklyScoresFromChain,
  mergeWeeklyLeaderboardEntries,
  enrichWeeklyEntriesWithMetadata,
} from '@/lib/game/weeklyLeaderboard';

const toSpacetimeRows = (players: Player[]) =>
  players.map((p) => ({
    walletAddress: p.walletAddress,
    username: p.username,
    avatarUrl: p.avatarUrl,
    weeklySessionId: p.weeklySessionId,
    weeklyBestScore: p.weeklyBestScore,
    totalEarnings: p.totalEarnings,
  }));

/** Server-side hybrid weekly leaderboard (chain + SpacetimeDB cache). */
export const getWeeklyLeaderboardEntries = async (
  limit: number = 10,
): Promise<{ sessionCounter: number; entries: WeeklyLeaderboardEntry[] }> => {
  if (process.env.SPACETIME_HOST && process.env.SPACETIME_MODULE) {
    await spacetimeClient.ensurePlayerDataReady();
  }

  const { sessionCounter, chainScores } = await fetchWeeklyScoresFromChain();
  const players = spacetimeClient.isConfigured()
    ? spacetimeClient.getAllPlayers()
    : [];

  const merged = mergeWeeklyLeaderboardEntries(
    sessionCounter,
    chainScores,
    toSpacetimeRows(players),
    limit,
  );

  return {
    sessionCounter,
    entries: enrichWeeklyEntriesWithMetadata(merged, toSpacetimeRows(players), limit),
  };
};
