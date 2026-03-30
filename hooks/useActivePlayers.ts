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
  refreshInterval?: number; // in milliseconds
  autoRefresh?: boolean;
}

export const useActivePlayers = ({
  maxPlayers = 16,
  refreshInterval = 30000,
  autoRefresh = true
}: UseActivePlayersOptions = {}) => {
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivePlayers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try live CDP SQL API first
      const response = await fetch('/api/active-players-live');
      if (!response.ok) {
        throw new Error('Failed to fetch active players');
      }
      
      const data = await response.json();
      
      // Log data source for debugging
      if (data.source && data.source.startsWith('demo')) {
        console.log('⚠️ Using demo players data:', data.source);
      } else if (data.source === 'cdp-sql-api-live') {
        console.log('✅ Using real live player data from CDP SQL API');
        console.log(`📊 Found ${data.count} active players from blockchain`);
      }
      
      setPlayers(data.players.slice(0, maxPlayers));
    } catch (err) {
      console.error('Error fetching active players:', err);
      setError(err instanceof Error ? err.message : 'Failed to load players');
      
      // Fallback to demo players if API fails
      setPlayers(generateDemoPlayers(maxPlayers));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate demo players for fallback
  const generateDemoPlayers = (count: number): ActivePlayer[] => {
    const demoAddresses = [
      '0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9',
      '0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF',
      '0x1234567890abcdef1234567890abcdef12345678',
      '0xabcdef1234567890abcdef1234567890abcdef12',
      '0x9876543210fedcba9876543210fedcba98765432',
      '0xfedcba0987654321fedcba0987654321fedcba09',
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444',
      '0x5555555555555555555555555555555555555555',
      '0x6666666666666666666666666666666666666666',
      '0x7777777777777777777777777777777777777777',
      '0x8888888888888888888888888888888888888888',
      '0x9999999999999999999999999999999999999999',
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    ];

    const demoUsernames = [
      'VITALIK.BASE.ETH',
      'PAULCRAMER.BASE.ETH',
      'ALICE.BASE.ETH',
      'BOB.BASE.ETH',
      'CHARLIE.BASE.ETH',
      'DAVE.BASE.ETH',
      'EVE.BASE.ETH',
      'FRANK.BASE.ETH',
      'GRACE.BASE.ETH',
      'HENRY.BASE.ETH',
      'IRIS.BASE.ETH',
      'JACK.BASE.ETH',
      'KATE.BASE.ETH',
      'LUCY.BASE.ETH',
      'MIKE.BASE.ETH',
      'NINA.BASE.ETH'
    ];

    return Array.from({ length: Math.min(count, demoAddresses.length) }, (_, i) => ({
      address: demoAddresses[i]!,
      username: demoUsernames[i]!,
      avatarUrl: null,
      totalScore: Math.floor(Math.random() * 1000) + 100,
      gamesPlayed: Math.floor(Math.random() * 50) + 1,
      isWalletUser: true,
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    }));
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
    refetch: fetchActivePlayers
  };
};
