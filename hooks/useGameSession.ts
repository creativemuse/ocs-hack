import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface GameSession {
  session_id: string;
  status: 'waiting' | 'active' | 'completed';
  player_count: number;
  paid_player_count: number;
  trial_player_count: number;
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
  waitingForPaidPlayer: boolean;
  playerId: string | null;
  entryToken: string | null;
  joinGame: (isPaidPlayer?: boolean, transactionHash?: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useGameSession = (): UseGameSessionReturn => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes default
  const [canJoin, setCanJoin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingForPaidPlayer, setWaitingForPaidPlayer] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [entryToken, setEntryToken] = useState<string | null>(null);
  const { address } = useAccount();

  // Load entryToken from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedToken = localStorage.getItem('beatme_entry_token');
    if (savedToken) {
      // Verify token is not expired before using it
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp > now) {
          setEntryToken(savedToken);
        } else {
          // Token expired, remove it
          localStorage.removeItem('beatme_entry_token');
        }
      } catch (e) {
        // Invalid token format, remove it
        localStorage.removeItem('beatme_entry_token');
      }
    }
  }, []);

  // Helper function to save token to localStorage
  const saveEntryToken = useCallback((token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('beatme_entry_token', token);
    }
    setEntryToken(token);
  }, []);

  // Helper function to clear token from localStorage
  const clearEntryToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('beatme_entry_token');
    }
    setEntryToken(null);
  }, []);

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
      // Fix: Allow joining when there are no paid players, regardless of time remaining
      setCanJoin(data.session.paid_player_count === 0 || data.timeRemaining > 0);
      setWaitingForPaidPlayer(data.waitingForPaidPlayer || false);
    } catch (err) {
      console.error('Error fetching game session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinGame = useCallback(async (isPaidPlayer: boolean = false, transactionHash?: string) => {
    try {
      setError(null);
      
      if (isPaidPlayer && !address) {
        throw new Error('Connect wallet to start a paid game');
      }

      // For paid games, transaction hash is required
      if (isPaidPlayer && !transactionHash) {
        console.warn('⚠️ Paid game started without transaction hash - this may cause issues');
      }

      // Generate a unique player ID if not already set
      const currentPlayerId = playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!playerId) {
        setPlayerId(currentPlayerId);
      }
      
      // Request a server-verified entry token before joining
      console.log('🔄 Joining game:', { isPaidPlayer, transactionHash, address });
      const sessionId = (await (await fetch('/api/game-session')).json()).session.session_id as string;
      console.log('📋 Session ID:', sessionId);
      
      const entryResp = await fetch('/api/game-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          isTrial: !isPaidPlayer, 
          walletAddress: isPaidPlayer ? address : undefined,
          paidTxHash: isPaidPlayer ? transactionHash : undefined
        }),
      });
      
      if (!entryResp.ok) {
        let msg = 'Entry not allowed';
        try {
          const err = await entryResp.json();
          msg = err?.error || msg;
          console.error('❌ Game entry failed:', err);
        } catch {}
        throw new Error(msg);
      }
      
      const { entryId, token } = await entryResp.json();
      console.log('✅ Game entry created:', { entryId, hasToken: !!token });

      const response = await fetch('/api/game-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'join',
          playerAddress: null, // For now, we'll handle wallet connection later
          isPaidPlayer,
          playerId: currentPlayerId,
          entryId,
          token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join game');
      }

      const data = await response.json();
      console.log('✅ Successfully joined game session:', data);
      setSession(data.session);
      setTimeRemaining(data.timeRemaining);
      saveEntryToken(token); // Use helper function to persist token
      // Fix: Allow joining when there are no paid players, regardless of time remaining
      setCanJoin(data.session.paid_player_count === 0 || data.timeRemaining > 0);
      setWaitingForPaidPlayer(data.waitingForPaidPlayer || false);
    } catch (err) {
      console.error('❌ Error joining game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMessage);
      throw err; // Re-throw to allow caller to handle
    }
  }, [playerId, address]);

  const leaveGame = useCallback(async () => {
    if (!playerId) {
      console.warn('No player ID to leave game');
      return;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/game-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'leave',
          playerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to leave game');
      }

      const data = await response.json();
      setSession(data.session);
      setTimeRemaining(data.timeRemaining);
      // Fix: Allow joining when there are no paid players, regardless of time remaining
      setCanJoin(data.session.paid_player_count === 0 || data.timeRemaining > 0);
      setWaitingForPaidPlayer(data.waitingForPaidPlayer || false);
      
      // Clear player ID when leaving
      setPlayerId(null);
      
      // Only clear entry token after successful leave
      clearEntryToken();
    } catch (err) {
      console.error('Error leaving game:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave game');
      // Don't clear token if leave failed - user is still in the game on server
    }
  }, [playerId, clearEntryToken]);

  // Countdown timer effect - only run if there's at least 1 paid player
  useEffect(() => {
    if (!session || session.status !== 'active' || timeRemaining <= 0 || session.paid_player_count === 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          // Only set canJoin to false if there are paid players
          if (session.paid_player_count > 0) {
            setCanJoin(false);
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]); // Removed timeRemaining from dependencies to prevent infinite loop

  // Effect to update canJoin whenever session or timeRemaining changes
  useEffect(() => {
    if (session) {
      // Fix: Allow joining when there are no paid players, regardless of time remaining
      setCanJoin(session.paid_player_count === 0 || timeRemaining > 0);
    }
  }, [session, timeRemaining]);

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
    waitingForPaidPlayer,
    playerId,
    entryToken,
    joinGame,
    leaveGame,
    refetch: fetchSession,
  };
};
