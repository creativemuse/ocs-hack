'use client';

import { useState, useEffect } from 'react';

export interface ActivePlayer {
  address: string;
  username: string;
  avatarUrl: string | null;
  totalScore: number;
  gamesPlayed: number;
  isWalletUser: boolean;
  lastActive: string;
}

interface UseActivePlayersOptions {
  maxPlayers?: number;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export const useActivePlayers = ({
  maxPlayers = 16,
  refreshInterval = 30000,
  autoRefresh = true,
}: UseActivePlayersOptions = {}) => {
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivePlayers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/active-players-live');
      if (!response.ok) {
        throw new Error('Failed to fetch active players');
      }

      const data = await response.json();

      if (data.source === 'spacetime-live') {
        console.log(`✅ Loaded ${data.count} live players from SpacetimeDB`);
      }

      setPlayers((data.players ?? []).slice(0, maxPlayers));
    } catch (err) {
      console.error('Error fetching active players:', err);
      setError(err instanceof Error ? err.message : 'Failed to load players');
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePlayers();

    if (autoRefresh) {
      const interval = setInterval(fetchActivePlayers, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [maxPlayers, refreshInterval, autoRefresh]);

  return {
    players,
    isLoading,
    error,
    refetch: fetchActivePlayers,
  };
};
