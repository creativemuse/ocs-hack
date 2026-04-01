import { useState, useEffect } from 'react';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { Player } from '@/lib/spacetime/database';

export interface TopEarner {
  walletAddress: string;
  username?: string;
  avatarUrl?: string;
  totalEarnings: number;
  gamesPlayed: number;
  bestScore: number;
}

export type LeaderboardViewType = 'scores' | 'earnings';

interface UseTopEarnersOptions {
  /**
   * View type: 'scores' for highest scores, 'earnings' for top earners
   * @default 'scores'
   */
  viewType?: LeaderboardViewType;
  /**
   * Enable real-time updates via WebSocket subscriptions
   * @default true (always realtime with new SDK)
   */
  realtime?: boolean;
  /**
   * Polling interval - deprecated, new SDK uses WebSocket by default
   * @deprecated
   */
  pollInterval?: number;
}

/**
 * Hook to fetch leaderboard with real-time updates
 * Supports two view types:
 * - 'scores': Sorts players by bestScore (highest to lowest)
 * - 'earnings': Sorts players by totalEarnings (highest to lowest)
 * 
 * @example
 * const { topEarners, isLoading } = useTopEarners(10, { viewType: 'scores' });
 */
export const useTopEarners = (
  limit: number = 10,
  options: UseTopEarnersOptions = {}
) => {
  const { viewType = 'scores' } = options;
  const { connection, isConnected, error: connectionError } = useSpacetime();
  
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    if (!isConnected || !connection) {
      setIsLoading(false);
      if (!connection) {
        setError('SpacetimeDB not connected');
      } else {
        setError(null); // Clear error if connection exists but not connected yet
      }
      return;
    }

    try {
      // Subscribe to players table changes
      const updateTopEarners = () => {
        // Use .iter() to get an iterable from SpacetimeDB table
        let filteredPlayers: Player[];
        
        if (viewType === 'scores') {
          // Filter players with scores > 0 and sort by bestScore
          filteredPlayers = (Array.from(connection.db.players.iter()) as Player[])
            .filter((p: Player) => p.bestScore > 0);
        } else {
          // Filter players with earnings > 0 and sort by totalEarnings
          filteredPlayers = (Array.from(connection.db.players.iter()) as Player[])
            .filter((p: Player) => p.totalEarnings > 0);
        }
        
        // Sort based on view type
        const sortedPlayers = filteredPlayers.sort((a: Player, b: Player) => {
          if (viewType === 'scores') {
            return b.bestScore - a.bestScore; // Sort by bestScore descending
          } else {
            return b.totalEarnings - a.totalEarnings; // Sort by totalEarnings descending
          }
        });
        
        const earners = sortedPlayers
          .slice(0, limit)
          .map((p: Player) => ({
            walletAddress: p.walletAddress,
            username: p.username,
            avatarUrl: p.avatarUrl,
            totalEarnings: p.totalEarnings,
            gamesPlayed: p.gamesPlayed,
            bestScore: p.bestScore,
          }));

        setTopEarners(earners);
        setLastUpdated(Date.now());
        setIsLoading(false);
      };

      // Initial update
      updateTopEarners();

      const onTableChange = () => {
        updateTopEarners();
      };

      connection.db.players.onInsert(onTableChange);
      connection.db.players.onUpdate(onTableChange);
      connection.db.players.onDelete(onTableChange);

      return () => {
        connection.db.players.removeOnInsert(onTableChange);
        connection.db.players.removeOnUpdate(onTableChange);
        connection.db.players.removeOnDelete(onTableChange);
      };
    } catch (err) {
      console.error('Error setting up leaderboard subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setIsLoading(false);
    }
  }, [connection, isConnected, limit, viewType]);

  useEffect(() => {
    if (connectionError) {
      setError(connectionError.message);
      setIsLoading(false);
    }
  }, [connectionError]);

  return {
    topEarners,
    isLoading,
    error,
    lastUpdated,
    refresh: () => {
      setLastUpdated(Date.now());
    },
    isRealtime: true, // Always realtime with new SDK
  };
};
