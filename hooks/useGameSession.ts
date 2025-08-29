import { useState, useEffect, useCallback } from 'react';

interface GameSession {
  session_id: string;
  status: 'waiting' | 'active' | 'completed';
  player_count: number;
  prize_pool: number;
  entry_fee: number;
  start_time: number;
  created_at: number;
}

interface UseGameSessionReturn {
  session: GameSession | null;
  timeRemaining: number;
  canJoin: boolean;
  isLoading: boolean;
  error: string | null;
  joinGame: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useGameSession = (): UseGameSessionReturn => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes default
  const [canJoin, setCanJoin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/game-session');
      if (!response.ok) {
        throw new Error('Failed to fetch game session');
      }
      
      const data = await response.json();
      setSession(data.session);
      setTimeRemaining(data.timeRemaining);
      setCanJoin(data.canJoin);
    } catch (err) {
      console.error('Error fetching game session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinGame = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/game-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'join',
          playerAddress: null, // For now, we'll handle wallet connection later
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join game');
      }

      const data = await response.json();
      setSession(data.session);
      setTimeRemaining(data.timeRemaining);
      setCanJoin(data.timeRemaining > 0);
    } catch (err) {
      console.error('Error joining game:', err);
      setError(err instanceof Error ? err.message : 'Failed to join game');
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!session || session.status !== 'active' || timeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setCanJoin(false);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]); // Removed timeRemaining from dependencies to prevent infinite loop

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchSession, 30000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  return {
    session,
    timeRemaining,
    canJoin,
    isLoading,
    error,
    joinGame,
    refetch: fetchSession,
  };
};
