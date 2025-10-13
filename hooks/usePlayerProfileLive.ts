import { useState, useEffect } from 'react';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { Player } from '@/lib/spacetime/database';

interface UsePlayerProfileOptions {
  /**
   * Enable real-time updates via WebSocket subscriptions
   * @default true (always realtime with new SDK)
   */
  realtime?: boolean;
}

/**
 * Hook to fetch player profile with real-time updates
 * 
 * @example
 * const { profile, isLoading, error } = usePlayerProfileLive('0x123...');
 */
export function usePlayerProfileLive(
  walletAddress: string | undefined,
  options: UsePlayerProfileOptions = {}
) {
  const { connection, isConnected, error: connectionError } = useSpacetime();
  
  const [profile, setProfile] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    if (!isConnected || !connection) {
      setIsLoading(false);
      return;
    }

    try {
      // Subscribe to players table changes for this specific wallet
      const updateProfile = () => {
        const players = connection.db.players.filter(
          (p: Player) => p.walletAddress === walletAddress
        );

        setProfile(players.length > 0 ? players[0] : null);
        setIsLoading(false);
      };

      // Initial update
      updateProfile();

      // Set up reactive listeners
      const unsubscribe = connection.db.players.onInsert(() => updateProfile());
      const unsubscribe2 = connection.db.players.onUpdate(() => updateProfile());
      const unsubscribe3 = connection.db.players.onDelete(() => updateProfile());

      return () => {
        unsubscribe();
        unsubscribe2();
        unsubscribe3();
      };
    } catch (err) {
      console.error('Error setting up player profile subscription:', err);
      setError(err instanceof Error ? err : new Error('Failed to load profile'));
      setIsLoading(false);
    }
  }, [connection, isConnected, walletAddress]);

  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
      setIsLoading(false);
    }
  }, [connectionError]);

  return {
    profile,
    isLoading,
    error,
    isRealtime: true, // Always realtime with new SDK
  };
}
