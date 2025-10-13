import { useState, useEffect } from 'react';

export interface PlayerProfile {
  address: string;
  totalGames: number;
  perfectRounds: number;
  totalEarnings: number;
  payoutCount: number;
  highestPayout: number;
  firstGame: string;
  lastGame: string;
  source: string;
}

interface UsePlayerProfileOptions {
  address: string | null;
  enabled?: boolean;
}

export const usePlayerProfile = ({ address, enabled = true }: UsePlayerProfileOptions) => {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !enabled) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/player-profile?address=${encodeURIComponent(address)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch player profile');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        console.log('✅ Loaded player profile from blockchain:', address);
        setProfile(data);
      } catch (err) {
        console.error('Error fetching player profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [address, enabled]);

  return {
    profile,
    isLoading,
    error
  };
};

