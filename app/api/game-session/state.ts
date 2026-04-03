type SessionStatus = 'waiting' | 'lobby' | 'active' | 'completed';

const FIVE_MINUTES_SECONDS = 300;
const DEFAULT_LOBBY_SECONDS = 180;

export type JoinPlayerMode = 'trial' | 'paid_solo' | 'paid_multiplayer';

/**
 * Session lane keys — each game mode gets its own independent session
 * so trial games never block paid entry and vice versa.
 */
type SessionLane = 'trial' | 'paid_solo' | 'paid_multiplayer';

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

/** Per-mode session map — each lane is fully independent. */
const sessions: Record<SessionLane, MemoryGameSession | null> = {
  trial: null,
  paid_solo: null,
  paid_multiplayer: null,
};

const createWaitingSession = (lane: SessionLane): MemoryGameSession => {
  const now = Date.now();
  return {
    session_id: `session_${lane}_${now}`,
    status: 'waiting',
    player_count: 0,
    paid_player_count: 0,
    trial_player_count: 0,
    prize_pool: 0,
    entry_fee: lane === 'trial' ? 0 : 1,
    start_time: now,
    created_at: now,
    players: [],
    lobby_until_ms: null,
  };
};

function laneFor(mode: JoinPlayerMode): SessionLane {
  return mode;
}

/**
 * Get the active session for a given mode lane.
 * Defaults to paid_multiplayer for backwards-compat with callers that don't specify.
 */
export const getActiveSession = (mode?: JoinPlayerMode): MemoryGameSession => {
  const lane = mode ? laneFor(mode) : 'paid_multiplayer';
  if (!sessions[lane]) {
    sessions[lane] = createWaitingSession(lane);
  }
  return sessions[lane]!;
};

export const reconcileLobbyToActive = (mode?: JoinPlayerMode): MemoryGameSession => {
  const lane = mode ? laneFor(mode) : 'paid_multiplayer';
  const session = getActiveSession(mode);
  if (session.status !== 'lobby' || !session.lobby_until_ms) {
    return session;
  }
  if (Date.now() >= session.lobby_until_ms) {
    sessions[lane] = {
      ...session,
      status: 'active',
      start_time: Date.now(),
      lobby_until_ms: null,
    };
    return sessions[lane]!;
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
  const inferredMode: JoinPlayerMode = opts?.playerMode ?? (isPaidPlayer ? 'paid_solo' : 'trial');
  const lane = laneFor(inferredMode);

  reconcileLobbyToActive(inferredMode);
  let session = getActiveSession(inferredMode);

  // Auto-reset expired sessions within the same lane
  if (
    session.status === 'active' &&
    session.paid_player_count > 0 &&
    inferredMode === 'paid_multiplayer'
  ) {
    const elapsed = Math.floor((Date.now() - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    if (remaining <= 0) {
      const sid = session.session_id;
      sessions[lane] = { ...createWaitingSession(lane), session_id: sid };
      session = sessions[lane]!;
    }
  }

  // Auto-reset expired paid_solo sessions
  if (
    session.status === 'active' &&
    session.paid_player_count > 0 &&
    inferredMode === 'paid_solo'
  ) {
    const elapsed = Math.floor((Date.now() - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    if (remaining <= 0) {
      sessions[lane] = createWaitingSession(lane);
      session = sessions[lane]!;
    }
  }

  const now = Date.now();
  const playerIdToUse = playerId || `player_${now}_${Math.random().toString(36).substr(2, 9)}`;

  if (session.players.some((p) => p.id === playerIdToUse)) {
    return session;
  }

  // Within-lane blocking (only same-mode conflicts)
  if (inferredMode === 'paid_solo' && session.status === 'active' && session.paid_player_count > 0) {
    const elapsed = Math.floor((now - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    if (remaining > 0) {
      throw new Error(`A solo paid game is in progress (${remaining}s remaining)`);
    }
  }

  if (inferredMode === 'paid_multiplayer' && session.status === 'active' && session.paid_player_count > 0) {
    const elapsed = Math.floor((now - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    if (remaining > 0) {
      throw new Error(`Multiplayer round in progress (${remaining}s remaining) — join the next lobby when it opens`);
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
  } else if (inferredMode === 'trial') {
    // Trial games start immediately
    if (session.status === 'waiting') {
      nextStatus = 'active';
      nextStartTime = now;
    }
  }

  sessions[lane] = {
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

  return sessions[lane]!;
};

export const endLobbyNow = (mode?: JoinPlayerMode): MemoryGameSession => {
  const m = mode ?? 'paid_multiplayer';
  reconcileLobbyToActive(m);
  const lane = laneFor(m);
  const session = getActiveSession(m);
  if (session.status !== 'lobby') {
    return session;
  }
  sessions[lane] = {
    ...session,
    status: 'active',
    start_time: Date.now(),
    lobby_until_ms: null,
  };
  return sessions[lane]!;
};

export const leaveActiveSession = (playerId: string, mode?: JoinPlayerMode): MemoryGameSession => {
  // Search all lanes if mode not specified
  let lane: SessionLane | null = null;
  if (mode) {
    lane = laneFor(mode);
  } else {
    for (const l of ['paid_multiplayer', 'paid_solo', 'trial'] as SessionLane[]) {
      const s = sessions[l];
      if (s && s.players.some((p) => p.id === playerId)) {
        lane = l;
        break;
      }
    }
  }
  if (!lane) {
    return getActiveSession('paid_multiplayer');
  }

  const session = getActiveSession(lane as JoinPlayerMode);
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

  const wasLastPlayer = newPlayerCount === 0;

  let newStatus = session.status;
  let newStartTime = session.start_time;
  let newPrizePool = session.prize_pool;
  let newLobbyUntil = session.lobby_until_ms;

  if (wasLastPlayer) {
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

  sessions[lane] = {
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

  return sessions[lane]!;
};

export const getTimeRemainingSeconds = (session?: MemoryGameSession, mode?: JoinPlayerMode): number => {
  const s = session ?? reconcileLobbyToActive(mode);

  if (s.status === 'lobby') {
    return 0;
  }

  if (s.paid_player_count === 0 && s.trial_player_count === 0) {
    return FIVE_MINUTES_SECONDS;
  }

  if (s.status !== 'active') {
    return FIVE_MINUTES_SECONDS;
  }

  const elapsed = Math.floor((Date.now() - s.start_time) / 1000);
  return Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
};

export const getLobbyTimeRemainingSeconds = (session?: MemoryGameSession, mode?: JoinPlayerMode): number => {
  const s = session ?? getActiveSession(mode);
  if (s.status !== 'lobby' || !s.lobby_until_ms) {
    return 0;
  }
  return Math.max(0, Math.ceil((s.lobby_until_ms - Date.now()) / 1000));
};

export const syncLobbyDurationSec = (durationSec: number, mode?: JoinPlayerMode): MemoryGameSession => {
  const m = mode ?? 'paid_multiplayer';
  reconcileLobbyToActive(m);
  const lane = laneFor(m);
  const session = getActiveSession(m);
  if (session.status !== 'lobby' || !session.lobby_until_ms) {
    return session;
  }
  const sec = Math.min(600, Math.max(30, Math.round(durationSec)));
  sessions[lane] = {
    ...session,
    lobby_until_ms: Date.now() + sec * 1000,
  };
  return sessions[lane]!;
};
