import { useState, useEffect } from 'react';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { Player } from '@/lib/spacetime/database';

interface UseActivePlayersOptions {
  /**
   * Polling interval - deprecated, new SDK uses WebSocket by default
   * @deprecated
   */
  pollInterval?: number;
}

/**
 * Hook to fetch active players with real-time updates
 * 
 * @example
 * const { players, isLoading, refresh } = useActivePlayersLive(50);
 */
export function useActivePlayersLive(
  limit: number = 50,
  options: UseActivePlayersOptions = {}
) {
  const { connection, isConnected, error: connectionError } = useSpacetime();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    if (!isConnected || !connection) {
      setIsLoading(false);
      return;
    }

    try {
      // Subscribe to players table changes
      const updateActivePlayers = () => {
        const activePlayers = connection.db.players
          .filter((p: Player) => p.gamesPlayed > 0)
          .sort((a: Player, b: Player) => Number(b.updatedAt) - Number(a.updatedAt))
          .slice(0, limit);

        setPlayers(Array.from(activePlayers));
        setLastUpdated(Date.now());
        setIsLoading(false);
      };

      // Initial update
      updateActivePlayers();

      // Set up reactive listeners
      const unsubscribe = connection.db.players.onInsert(() => updateActivePlayers());
      const unsubscribe2 = connection.db.players.onUpdate(() => updateActivePlayers());
      const unsubscribe3 = connection.db.players.onDelete(() => updateActivePlayers());

      return () => {
        unsubscribe();
        unsubscribe2();
        unsubscribe3();
      };
    } catch (err) {
      console.error('Error setting up active players subscription:', err);
      setError(err instanceof Error ? err : new Error('Failed to load active players'));
      setIsLoading(false);
    }
  }, [connection, isConnected, limit]);

  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setIsLoading(false);
    }
  }, [connectionError]);

  return {
    players,
    isLoading,
    error,
    lastUpdated,
    refresh: () => {
      setLastUpdated(Date.now());
    },
  };
}
