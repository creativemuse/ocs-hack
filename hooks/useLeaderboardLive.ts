import { useState, useEffect } from 'react';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { PlayerStats } from '@/lib/spacetime/database';

interface UseLeaderboardOptions {
  /**
   * Enable real-time updates via WebSocket subscriptions
   * @default true (always realtime with new SDK)
   */
  realtime?: boolean;
  /**
   * Type of leaderboard: 'paid' (prize-eligible) or 'trial'
   * @default 'paid'
   */
  type?: 'paid' | 'trial';
  /**
   * Polling interval - deprecated, new SDK uses WebSocket by default
   * @deprecated
   */
  pollInterval?: number;
}

/**
 * Hook to fetch leaderboard data with real-time updates
 * 
 * @example
 * // Paid player leaderboard with real-time updates
 * const { stats, isLoading } = useLeaderboardLive(10);
 * 
 * @example
 * // Trial player leaderboard
 * const { stats } = useLeaderboardLive(10, { type: 'trial' });
 */
export function useLeaderboardLive(
  limit: number = 10,
  options: UseLeaderboardOptions = {}
) {
  const { type = 'paid' } = options;
  const { connection, isConnected, error: connectionError } = useSpacetime();
  
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    if (!isConnected || !connection) {
      setIsLoading(false);
      return;
    }

    try {
      // Subscribe to player_stats table changes
      const updateLeaderboard = () => {
        const playerTypeTag = type === 'paid' ? 'Paid' : 'Trial';
        const leaderboard = Array.from(connection.db.player_stats.iter())
          .filter((s: PlayerStats) => s.playerType.tag === playerTypeTag)
          .sort((a: PlayerStats, b: PlayerStats) => b.bestScore - a.bestScore)
          .slice(0, limit);

        setStats(leaderboard);
        setLastUpdated(Date.now());
        setIsLoading(false);
      };

      // Initial update
      updateLeaderboard();

      const onTableChange = () => {
        updateLeaderboard();
      };

      connection.db.player_stats.onInsert(onTableChange);
      connection.db.player_stats.onUpdate(onTableChange);
      connection.db.player_stats.onDelete(onTableChange);

      return () => {
        connection.db.player_stats.removeOnInsert(onTableChange);
        connection.db.player_stats.removeOnUpdate(onTableChange);
        connection.db.player_stats.removeOnDelete(onTableChange);
      };
    } catch (err) {
      console.error('Error setting up leaderboard subscription:', err);
      setError(err instanceof Error ? err : new Error('Failed to load leaderboard'));
      setIsLoading(false);
    }
  }, [connection, isConnected, limit, type]);

  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setIsLoading(false);
    }
  }, [connectionError]);

  return {
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh: () => {
      setLastUpdated(Date.now());
    },
    isRealtime: true, // Always realtime with new SDK
    type,
  };
}
