import { useMemo } from 'react';
import { useWeeklyLeaderboard } from '@/hooks/useWeeklyLeaderboard';
import type { LeaderboardEntry } from '@/types/game';
import type { PlayerStats } from '@/lib/spacetime/database';

interface UseLeaderboardOptions {
  realtime?: boolean;
  type?: 'paid' | 'trial';
  pollInterval?: number;
}

const mapToLeaderboardEntry = (
  entry: {
    walletAddress: string;
    username?: string;
    bestScore: number;
    totalEarnings?: number;
  },
  rank: number,
): LeaderboardEntry => ({
  rank,
  playerAddress: entry.walletAddress,
  playerName: entry.username,
  totalScore: entry.bestScore,
  gamesPlayed: 1,
  averageScore: entry.bestScore,
  totalEarnings: entry.totalEarnings ?? 0,
  lastPlayed: Date.now(),
  isTrialPlayer: false,
});

/**
 * Weekly paid leaderboard with real-time SpacetimeDB merge.
 * Trial type falls back to guest_players via Spacetime cache (legacy shape).
 */
export function useLeaderboardLive(
  limit: number = 10,
  options: UseLeaderboardOptions = {},
) {
  const { type = 'paid' } = options;
  const {
    entries: weeklyEntries,
    sessionCounter,
    isLoading,
    error,
    lastUpdated,
    refresh,
  } = useWeeklyLeaderboard(limit);

  const stats: PlayerStats[] = useMemo(() => {
    if (type !== 'paid') return [];
    return weeklyEntries.map(
      (entry, index) =>
        ({
          walletAddress: entry.walletAddress,
          bestScore: entry.bestScore,
          totalScore: entry.bestScore,
          totalGames: 1,
          averageScore: entry.bestScore,
          playerType: { tag: 'Paid' as const },
          rank: index + 1,
        }) as unknown as PlayerStats,
    );
  }, [weeklyEntries, type]);

  const leaderboardEntries: LeaderboardEntry[] = useMemo(
    () =>
      type === 'paid'
        ? weeklyEntries.map((entry, index) =>
            mapToLeaderboardEntry(entry, index + 1),
          )
        : [],
    [weeklyEntries, type],
  );

  return {
    stats,
    leaderboardEntries,
    sessionCounter,
    isLoading,
    error: error ? new Error(error) : null,
    lastUpdated,
    refresh,
    isRealtime: true,
    type,
  };
}
