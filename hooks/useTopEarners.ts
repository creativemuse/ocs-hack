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

interface UseTopEarnersOptions {
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
 * Hook to fetch top earners with real-time updates
 * 
 * @example
 * const { topEarners, isLoading } = useTopEarners(10);
 */
export const useTopEarners = (
  limit: number = 10,
  options: UseTopEarnersOptions = {}
) => {
  const { connection, isConnected, error: connectionError } = useSpacetime();
  
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    if (!isConnected || !connection) {
      setIsLoading(false);
      return;
    }

    try {
      // Subscribe to players table changes
      const updateTopEarners = () => {
        // Use .iter() to get an iterable from SpacetimeDB table
        const earners = (Array.from(connection.db.players.iter()) as Player[])
          .filter((p: Player) => p.totalEarnings > 0)
          .sort((a: Player, b: Player) => b.totalEarnings - a.totalEarnings)
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

      // Set up reactive listener
      const unsubscribe = connection.db.players.onInsert(() => updateTopEarners());
      const unsubscribe2 = connection.db.players.onUpdate(() => updateTopEarners());
      const unsubscribe3 = connection.db.players.onDelete(() => updateTopEarners());

      return () => {
        unsubscribe();
        unsubscribe2();
        unsubscribe3();
      };
    } catch (err) {
      console.error('Error setting up top earners subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load top earners');
      setIsLoading(false);
    }
  }, [connection, isConnected, limit]);

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
