import { isSpacetimeHttpConfigured, mapSqlPlayerRow, querySql } from '@/lib/apis/spacetimeHttp';
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
  const { sessionCounter, chainScores } = await fetchWeeklyScoresFromChain();

  let players: Player[] = [];
  if (isSpacetimeHttpConfigured()) {
    const rows = await querySql<Record<string, unknown>>('SELECT * FROM players');
    players = rows.map(mapSqlPlayerRow);
  }

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
