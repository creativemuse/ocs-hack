type SessionStatus = 'waiting' | 'lobby' | 'active' | 'completed';

const FIVE_MINUTES_SECONDS = 300;
const DEFAULT_LOBBY_SECONDS = 180;

export type JoinPlayerMode = 'trial' | 'paid_solo' | 'paid_multiplayer';

export interface PlayerInfo {
  id: string;
  isPaidPlayer: boolean;
  joinedAt: number;
  playerType: 'trial' | 'paid';
  walletAddress?: string;
}

export interface MemoryGameSession {
  session_id: string;
  status: SessionStatus;
  player_count: number;
  paid_player_count: number;
  trial_player_count: number;
  prize_pool: number;
  entry_fee: number;
  start_time: number;
  created_at: number;
  players: PlayerInfo[];
  lobby_until_ms: number | null;
}

let activeSession: MemoryGameSession | null = null;

const createWaitingSession = (): MemoryGameSession => {
  const now = Date.now();
  return {
    session_id: `session_${now}`,
    status: 'waiting',
    player_count: 0,
    paid_player_count: 0,
    trial_player_count: 0,
    prize_pool: 0,
    entry_fee: 1,
    start_time: now,
    created_at: now,
    players: [],
    lobby_until_ms: null,
  };
};

export const getActiveSession = (): MemoryGameSession => {
  if (!activeSession) {
    activeSession = createWaitingSession();
  }
  return activeSession;
};

export const reconcileLobbyToActive = (): MemoryGameSession => {
  const session = getActiveSession();
  if (session.status !== 'lobby' || !session.lobby_until_ms) {
    return session;
  }
  if (Date.now() >= session.lobby_until_ms) {
    activeSession = {
      ...session,
      status: 'active',
      start_time: Date.now(),
      lobby_until_ms: null,
    };
    return activeSession!;
  }
  return session;
};

export interface JoinOptions {
  playerMode?: JoinPlayerMode;
  lobbyDurationSec?: number;
  walletAddress?: string;
}

export const joinActiveSession = (
  isPaidPlayer: boolean = false,
  playerId?: string,
  opts?: JoinOptions
): MemoryGameSession => {
  reconcileLobbyToActive();
  let session = getActiveSession();
  const inferredModeEarly: JoinPlayerMode = opts?.playerMode ?? (isPaidPlayer ? 'paid_solo' : 'trial');
  if (
    session.status === 'active' &&
    session.paid_player_count > 0 &&
    inferredModeEarly === 'paid_multiplayer'
  ) {
    const elapsed = Math.floor((Date.now() - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    if (remaining <= 0) {
      const sid = session.session_id;
      activeSession = { ...createWaitingSession(), session_id: sid };
      session = activeSession!;
    }
  }
  const now = Date.now();
  const playerIdToUse = playerId || `player_${now}_${Math.random().toString(36).substr(2, 9)}`;

  const inferredMode: JoinPlayerMode = opts?.playerMode ?? (isPaidPlayer ? 'paid_solo' : 'trial');

  if (session.players.some((p) => p.id === playerIdToUse)) {
    return session;
  }

  if (session.status === 'lobby' && inferredMode === 'trial') {
    throw new Error('Multiplayer lobby in progress — trial join paused');
  }

  if (session.status === 'lobby' && inferredMode === 'paid_solo') {
    throw new Error('Multiplayer lobby in progress — try multiplayer or wait');
  }

  if (inferredMode === 'paid_solo' && session.status === 'active' && session.paid_player_count > 0) {
    throw new Error('A paid game is already in progress');
  }

  if (inferredMode === 'paid_multiplayer' && session.status === 'active' && session.paid_player_count > 0) {
    const elapsed = Math.floor((now - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    if (remaining > 0) {
      throw new Error('Round in progress — join the next lobby when it opens');
    }
  }

  const newPlayer: PlayerInfo = {
    id: playerIdToUse,
    isPaidPlayer,
    joinedAt: now,
    playerType: isPaidPlayer ? 'paid' : 'trial',
    walletAddress: opts?.walletAddress,
  };

  const newPlayers = [...session.players, newPlayer];
  const newPaidPlayerCount = newPlayers.filter((p) => p.isPaidPlayer).length;
  const newTrialPlayerCount = newPlayers.filter((p) => !p.isPaidPlayer).length;
  const newPlayerCount = newPlayers.length;

  let nextStatus = session.status;
  let nextStartTime = session.start_time;
  let nextPrizePool = session.prize_pool;
  let nextLobbyUntil = session.lobby_until_ms;

  if (isPaidPlayer) {
    nextPrizePool = session.prize_pool + session.entry_fee;
  }

  if (inferredMode === 'paid_multiplayer' && isPaidPlayer) {
    const lobbySec = Math.min(600, Math.max(1, opts?.lobbyDurationSec ?? DEFAULT_LOBBY_SECONDS));
    if (session.status === 'waiting' || session.paid_player_count === 0) {
      nextStatus = 'lobby';
      nextLobbyUntil = now + lobbySec * 1000;
      nextStartTime = now;
    } else if (session.status === 'lobby') {
      nextStatus = 'lobby';
    } else {
      throw new Error('Cannot start multiplayer lobby in current session state');
    }
  } else if (inferredMode === 'paid_solo' && isPaidPlayer) {
    const isFirstPaid = session.paid_player_count === 0;
    if (isFirstPaid || session.status === 'waiting') {
      nextStatus = 'active';
      nextStartTime = now;
      nextLobbyUntil = null;
    }
  }

  activeSession = {
    ...session,
    player_count: newPlayerCount,
    paid_player_count: newPaidPlayerCount,
    trial_player_count: newTrialPlayerCount,
    prize_pool: nextPrizePool,
    status: nextStatus,
    start_time: nextStartTime,
    players: newPlayers,
    lobby_until_ms: nextLobbyUntil,
  };

  return activeSession!;
};

export const endLobbyNow = (): MemoryGameSession => {
  reconcileLobbyToActive();
  const session = getActiveSession();
  if (session.status !== 'lobby') {
    return session;
  }
  activeSession = {
    ...session,
    status: 'active',
    start_time: Date.now(),
    lobby_until_ms: null,
  };
  return activeSession!;
};

export const leaveActiveSession = (playerId: string): MemoryGameSession => {
  const session = getActiveSession();
  const now = Date.now();

  const playerIndex = session.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return session;
  }

  const leavingPlayer = session.players[playerIndex];
  const newPlayers = session.players.filter((p) => p.id !== playerId);

  const newPaidPlayerCount = newPlayers.filter((p) => p.isPaidPlayer).length;
  const newTrialPlayerCount = newPlayers.filter((p) => !p.isPaidPlayer).length;
  const newPlayerCount = newPlayers.length;

  const wasLastTrialOrPaidPlayer = newPlayerCount === 0;

  let newStatus = session.status;
  let newStartTime = session.start_time;
  let newPrizePool = session.prize_pool;
  let newLobbyUntil = session.lobby_until_ms;

  if (wasLastTrialOrPaidPlayer) {
    newStatus = 'waiting';
    newStartTime = now;
    newPrizePool = 0;
    newLobbyUntil = null;
  } else if (leavingPlayer.isPaidPlayer && newPaidPlayerCount === 0) {
    newStatus = 'waiting';
    newStartTime = now;
    newPrizePool = 0;
    newLobbyUntil = null;
  }

  activeSession = {
    ...session,
    player_count: newPlayerCount,
    paid_player_count: newPaidPlayerCount,
    trial_player_count: newTrialPlayerCount,
    prize_pool: newPrizePool,
    status: newStatus,
    start_time: newStartTime,
    players: newPlayers,
    lobby_until_ms: newLobbyUntil,
  };

  return activeSession!;
};

export const getTimeRemainingSeconds = (session?: MemoryGameSession): number => {
  const s = session ?? reconcileLobbyToActive();

  if (s.status === 'lobby') {
    return 0;
  }

  if (s.paid_player_count === 0) {
    return FIVE_MINUTES_SECONDS;
  }

  if (s.status !== 'active') {
    return FIVE_MINUTES_SECONDS;
  }

  const elapsed = Math.floor((Date.now() - s.start_time) / 1000);
  return Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
};

export const getLobbyTimeRemainingSeconds = (session?: MemoryGameSession): number => {
  const s = session ?? getActiveSession();
  if (s.status !== 'lobby' || !s.lobby_until_ms) {
    return 0;
  }
  return Math.max(0, Math.ceil((s.lobby_until_ms - Date.now()) / 1000));
};

export const syncLobbyDurationSec = (durationSec: number): MemoryGameSession => {
  reconcileLobbyToActive();
  const session = getActiveSession();
  if (session.status !== 'lobby' || !session.lobby_until_ms) {
    return session;
  }
  const sec = Math.min(600, Math.max(30, Math.round(durationSec)));
  activeSession = {
    ...session,
    lobby_until_ms: Date.now() + sec * 1000,
  };
  return activeSession!;
};
