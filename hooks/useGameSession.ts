import { useState, useEffect, useCallback } from 'react';
import { useBaseAccount } from './useBaseAccount';
import type { PlayerModeChoice } from '@/types/game';

export interface GameSessionPlayer {
  id: string;
  isPaidPlayer: boolean;
  joinedAt: number;
  playerType: 'trial' | 'paid';
  walletAddress?: string;
}

export interface GameSession {
  session_id: string;
  status: 'waiting' | 'lobby' | 'active' | 'completed';
  player_count: number;
  paid_player_count: number;
  trial_player_count: number;
  prize_pool: number;
  entry_fee: number;
  start_time: number;
  created_at: number;
  players?: GameSessionPlayer[];
  lobby_until_ms?: number | null;
}

export interface JoinGameOptions {
  playerMode?: PlayerModeChoice;
  lobbyDurationSec?: number;
}

interface UseGameSessionReturn {
  session: GameSession | null;
  timeRemaining: number;
  lobbyTimeRemaining: number;
  inLobby: boolean;
  canJoin: boolean;
  isLoading: boolean;
  error: string | null;
  waitingForPaidPlayer: boolean;
  playerId: string | null;
  entryToken: string | null;
  joinGame: (
    isPaidPlayer?: boolean,
    transactionHash?: string,
    options?: JoinGameOptions
  ) => Promise<Record<string, unknown>>;
  leaveGame: () => Promise<void>;
  endLobby: () => Promise<void>;
  syncLobbyDuration: (durationSec: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useGameSession = (): UseGameSessionReturn => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [lobbyTimeRemaining, setLobbyTimeRemaining] = useState(0);
  const [inLobby, setInLobby] = useState(false);
  const [canJoin, setCanJoin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingForPaidPlayer, setWaitingForPaidPlayer] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [entryToken, setEntryToken] = useState<string | null>(null);
  const { address } = useBaseAccount();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('beatme_entry_token');
    if (savedToken) {
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp > now) {
          setEntryToken(savedToken);
        } else {
          localStorage.removeItem('beatme_entry_token');
        }
      } catch {
        localStorage.removeItem('beatme_entry_token');
      }
    }
  }, []);

  const saveEntryToken = useCallback((token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('beatme_entry_token', token);
    }
    setEntryToken(token);
  }, []);

  const clearEntryToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('beatme_entry_token');
    }
    setEntryToken(null);
  }, []);

  const applySessionPayload = useCallback((data: Record<string, unknown>) => {
    setSession(data.session as GameSession);
    setTimeRemaining((data.timeRemaining as number) ?? 0);
    setLobbyTimeRemaining((data.lobbyTimeRemaining as number) ?? 0);
    setInLobby(Boolean(data.inLobby));
    setCanJoin(data.canJoin !== false);
    setWaitingForPaidPlayer(Boolean(data.waitingForPaidPlayer));
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
      applySessionPayload(data);
    } catch (err) {
      console.error('Error fetching game session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game session');
    } finally {
      setIsLoading(false);
    }
  }, [applySessionPayload]);

  const joinGame = useCallback(
    async (isPaidPlayer: boolean = false, transactionHash?: string, options?: JoinGameOptions) => {
      setError(null);

      if (isPaidPlayer && !address) {
        throw new Error('Connect wallet to start a paid game');
      }

      if (isPaidPlayer && !transactionHash) {
        console.warn('⚠️ Paid game started without transaction hash - this may cause issues');
      }

      const currentPlayerId = playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!playerId) {
        setPlayerId(currentPlayerId);
      }

      const sessionId = (await (await fetch('/api/game-session')).json()).session.session_id as string;

      const entryResp = await fetch('/api/game-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          isTrial: !isPaidPlayer,
          walletAddress: isPaidPlayer ? address : undefined,
          paidTxHash: isPaidPlayer ? transactionHash : undefined,
        }),
      });

      if (!entryResp.ok) {
        let msg = 'Entry not allowed';
        try {
          const err = await entryResp.json();
          msg = (err as { error?: string }).error || msg;
        } catch {}
        throw new Error(msg);
      }

      const { entryId, token } = await entryResp.json();

      const response = await fetch('/api/game-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          isPaidPlayer,
          playerId: currentPlayerId,
          entryId,
          token,
          playerMode: options?.playerMode,
          lobbyDurationSec: options?.lobbyDurationSec,
        }),
      });

      if (!response.ok) {
        let msg = 'Failed to join game';
        try {
          const err = await response.json();
          msg = (err as { error?: string }).error || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = (await response.json()) as Record<string, unknown>;
      applySessionPayload(data);
      saveEntryToken(token as string);
      return data;
    },
    [playerId, address, applySessionPayload, saveEntryToken]
  );

  const leaveGame = useCallback(async () => {
    if (!playerId) {
      console.warn('No player ID to leave game');
      return;
    }

    try {
      setError(null);

      const response = await fetch('/api/game-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', playerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to leave game');
      }

      const data = await response.json();
      applySessionPayload(data);

      setPlayerId(null);
      clearEntryToken();
    } catch (err) {
      console.error('Error leaving game:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave game');
    }
  }, [playerId, clearEntryToken, applySessionPayload]);

  const endLobby = useCallback(async () => {
    try {
      const response = await fetch('/api/game-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_lobby' }),
      });
      if (!response.ok) return;
      const data = await response.json();
      applySessionPayload(data);
    } catch (e) {
      console.error('endLobby failed', e);
    }
  }, [applySessionPayload]);

  const syncLobbyDuration = useCallback(
    async (durationSec: number) => {
      try {
        const response = await fetch('/api/game-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync_lobby_duration', durationSec }),
        });
        if (!response.ok) return;
        const data = await response.json();
        applySessionPayload(data);
      } catch (e) {
        console.error('syncLobbyDuration failed', e);
      }
    },
    [applySessionPayload]
  );

  // Intentionally omit timeRemaining from deps: adding it would reset the interval every tick.
  useEffect(() => {
    if (!session || session.status !== 'active' || timeRemaining <= 0 || session.paid_player_count === 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          if (session.paid_player_count > 0) {
            setCanJoin(false);
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interval should not reset when timeRemaining ticks
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const isWaiting = session.status === 'waiting';
    const isLobbyOpen = session.status === 'lobby' && lobbyTimeRemaining > 0;
    const isActiveWithTime =
      session.status === 'active' && session.paid_player_count > 0 && timeRemaining > 0;
    const hasNoPaidPlayers = session.paid_player_count === 0;
    setCanJoin(isWaiting || isLobbyOpen || isActiveWithTime || hasNoPaidPlayers);
  }, [session, timeRemaining, lobbyTimeRemaining]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const interval = setInterval(fetchSession, 30000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  return {
    session,
    timeRemaining,
    lobbyTimeRemaining,
    inLobby,
    canJoin,
    isLoading,
    error,
    waitingForPaidPlayer,
    playerId,
    entryToken,
    joinGame,
    leaveGame,
    endLobby,
    syncLobbyDuration,
    refetch: fetchSession,
  };
};
