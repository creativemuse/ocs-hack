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

/* ── Per-mode session lanes ────────────────────────────────────────── */

const sessionLanes: Record<JoinPlayerMode, MemoryGameSession | null> = {
  trial: null,
  paid_solo: null,
  paid_multiplayer: null,
};

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

/** Clear a lane whose session has expired or completed. */
function autoExpireIfStale(mode: JoinPlayerMode): void {
  const session = sessionLanes[mode];
  if (!session) return;

  if (session.status === 'completed') {
    sessionLanes[mode] = null;
    return;
  }

  if (session.status === 'active' && session.paid_player_count > 0) {
    const elapsed = Math.floor((Date.now() - session.start_time) / 1000);
    if (elapsed >= FIVE_MINUTES_SECONDS) {
      sessionLanes[mode] = null;
    }
  }
}

/** Format remaining seconds as "M:SS". */
function fmtRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ── Public API ────────────────────────────────────────────────────── */

export const getActiveSession = (mode: JoinPlayerMode): MemoryGameSession => {
  autoExpireIfStale(mode);
  if (!sessionLanes[mode]) {
    sessionLanes[mode] = createWaitingSession();
  }
  return sessionLanes[mode]!;
};

export const reconcileLobbyToActive = (): MemoryGameSession => {
  const session = getActiveSession('paid_multiplayer');
  if (session.status !== 'lobby' || !session.lobby_until_ms) {
    return session;
  }
  if (Date.now() >= session.lobby_until_ms) {
    sessionLanes['paid_multiplayer'] = {
      ...session,
      status: 'active',
      start_time: Date.now(),
      lobby_until_ms: null,
    };
    return sessionLanes['paid_multiplayer']!;
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

  // Reconcile lobby if joining multiplayer
  if (inferredMode === 'paid_multiplayer') {
    reconcileLobbyToActive();
  }

  let session = getActiveSession(inferredMode);

  const now = Date.now();
  const playerIdToUse = playerId || `player_${now}_${Math.random().toString(36).substr(2, 9)}`;

  // Already in session — no-op
  if (session.players.some((p) => p.id === playerIdToUse)) {
    return session;
  }

  /* ── Same-mode blocking (cross-mode is intentionally absent) ────── */

  const paidPlayersInSession = session.players.filter((p) => p.isPaidPlayer);
  const walletNorm = opts?.walletAddress?.toLowerCase();
  const solePaidWallet = paidPlayersInSession[0]?.walletAddress?.toLowerCase();
  const isSoloPaidReplay =
    inferredMode === 'paid_solo' &&
    isPaidPlayer &&
    session.status === 'active' &&
    paidPlayersInSession.length === 1 &&
    Boolean(walletNorm && solePaidWallet && walletNorm === solePaidWallet);

  if (
    inferredMode === 'paid_solo' &&
    session.status === 'active' &&
    session.paid_player_count > 0 &&
    !isSoloPaidReplay
  ) {
    const elapsed = Math.floor((now - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    throw new Error(`A paid solo game is already in progress (${fmtRemaining(remaining)} remaining)`);
  }

  if (inferredMode === 'paid_multiplayer' && session.status === 'active' && session.paid_player_count > 0) {
    const elapsed = Math.floor((now - session.start_time) / 1000);
    const remaining = Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
    if (remaining > 0) {
      throw new Error(`Multiplayer round in progress (${fmtRemaining(remaining)} remaining) — join the next lobby when it opens`);
    }
  }

  /* ── Build updated session ─────────────────────────────────────── */

  const newPlayer: PlayerInfo = {
    id: playerIdToUse,
    isPaidPlayer,
    joinedAt: now,
    playerType: isPaidPlayer ? 'paid' : 'trial',
    walletAddress: opts?.walletAddress,
  };

  const newPlayers = isSoloPaidReplay
    ? [...session.players.filter((p) => !p.isPaidPlayer), newPlayer]
    : [...session.players, newPlayer];
  const newPaidPlayerCount = newPlayers.filter((p) => p.isPaidPlayer).length;
  const newTrialPlayerCount = newPlayers.filter((p) => !p.isPaidPlayer).length;
  const newPlayerCount = newPlayers.length;

  let nextStatus = session.status;
  let nextStartTime = session.start_time;
  let nextPrizePool = session.prize_pool;
  let nextLobbyUntil = session.lobby_until_ms;

  if (isPaidPlayer) {
    nextPrizePool = isSoloPaidReplay ? session.entry_fee : session.prize_pool + session.entry_fee;
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
    if (isSoloPaidReplay) {
      nextStatus = 'active';
      nextStartTime = now;
      nextLobbyUntil = null;
    } else {
      const isFirstPaid = session.paid_player_count === 0;
      if (isFirstPaid || session.status === 'waiting') {
        nextStatus = 'active';
        nextStartTime = now;
        nextLobbyUntil = null;
      }
    }
  }

  sessionLanes[inferredMode] = {
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

  return sessionLanes[inferredMode]!;
};

export const endLobbyNow = (): MemoryGameSession => {
  reconcileLobbyToActive();
  const session = getActiveSession('paid_multiplayer');
  if (session.status !== 'lobby') {
    return session;
  }
  sessionLanes['paid_multiplayer'] = {
    ...session,
    status: 'active',
    start_time: Date.now(),
    lobby_until_ms: null,
  };
  return sessionLanes['paid_multiplayer']!;
};

export const leaveActiveSession = (playerId: string): MemoryGameSession => {
  // Search all lanes for the player
  let foundMode: JoinPlayerMode | null = null;
  let session: MemoryGameSession | null = null;
  for (const mode of ['trial', 'paid_solo', 'paid_multiplayer'] as JoinPlayerMode[]) {
    const s = sessionLanes[mode];
    if (s && s.players.some((p) => p.id === playerId)) {
      foundMode = mode;
      session = s;
      break;
    }
  }

  if (!foundMode || !session) {
    // Player not found in any lane — return a safe default
    return getActiveSession('trial');
  }

  const now = Date.now();
  const leavingPlayer = session.players.find((p) => p.id === playerId)!;
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

  sessionLanes[foundMode] = {
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

  return sessionLanes[foundMode]!;
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
  const s = session ?? getActiveSession('paid_multiplayer');
  if (s.status !== 'lobby' || !s.lobby_until_ms) {
    return 0;
  }
  return Math.max(0, Math.ceil((s.lobby_until_ms - Date.now()) / 1000));
};

export const syncLobbyDurationSec = (durationSec: number): MemoryGameSession => {
  reconcileLobbyToActive();
  const session = getActiveSession('paid_multiplayer');
  if (session.status !== 'lobby' || !session.lobby_until_ms) {
    return session;
  }
  const sec = Math.min(600, Math.max(30, Math.round(durationSec)));
  sessionLanes['paid_multiplayer'] = {
    ...session,
    lobby_until_ms: Date.now() + sec * 1000,
  };
  return sessionLanes['paid_multiplayer']!;
};
