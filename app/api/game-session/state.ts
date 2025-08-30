type SessionStatus = 'waiting' | 'active' | 'completed';

export interface MemoryGameSession {
  session_id: string;
  status: SessionStatus;
  player_count: number;
  paid_player_count: number; // New field to track paid players
  trial_player_count: number; // New field to track trial players
  prize_pool: number;
  entry_fee: number;
  start_time: number; // ms epoch
  created_at: number; // ms epoch
  players: PlayerInfo[]; // Track individual players
}

export interface PlayerInfo {
  id: string;
  isPaidPlayer: boolean;
  joinedAt: number;
  playerType: 'trial' | 'paid';
}

const FIVE_MINUTES_SECONDS = 300;

let activeSession: MemoryGameSession | null = null;

const createWaitingSession = (): MemoryGameSession => {
  const now = Date.now();
  return {
    session_id: `session_${now}`,
    status: 'waiting',
    player_count: 0,
    paid_player_count: 0,
    trial_player_count: 0,
    prize_pool: 0, // Start with 0 USDC - only accumulates from entry fees
    entry_fee: 1,
    start_time: now,
    created_at: now,
    players: [],
  };
};

export const getActiveSession = (): MemoryGameSession => {
  if (!activeSession) {
    activeSession = createWaitingSession();
  }
  return activeSession;
};

export const joinActiveSession = (isPaidPlayer: boolean = false, playerId?: string): MemoryGameSession => {
  const session = getActiveSession();
  const now = Date.now();
  const playerIdToUse = playerId || `player_${now}_${Math.random().toString(36).substr(2, 9)}`;

  // Check if player already exists
  const existingPlayerIndex = session.players.findIndex(p => p.id === playerIdToUse);
  if (existingPlayerIndex !== -1) {
    // Player already exists, return current session
    return session;
  }

  // Add new player
  const newPlayer: PlayerInfo = {
    id: playerIdToUse,
    isPaidPlayer,
    joinedAt: now,
    playerType: isPaidPlayer ? 'paid' : 'trial',
  };

  const newPlayers = [...session.players, newPlayer];
  
  // Update player counts
  const newPaidPlayerCount = newPlayers.filter(p => p.isPaidPlayer).length;
  const newTrialPlayerCount = newPlayers.filter(p => !p.isPaidPlayer).length;
  const newPlayerCount = newPlayers.length;

  // Check if this is the first paid player (which starts the timer)
  const isFirstPaidPlayer = isPaidPlayer && session.paid_player_count === 0;
  
  // Only start the timer if there's at least 1 paid player
  const shouldStartTimer = isFirstPaidPlayer;
  const newStatus = shouldStartTimer ? 'active' as SessionStatus : session.status;
  const newStartTime = shouldStartTimer ? now : session.start_time;
  
  // Only add to prize pool if it's a paid player
  const newPrizePool = isPaidPlayer ? session.prize_pool + session.entry_fee : session.prize_pool;

  activeSession = {
    ...session,
    player_count: newPlayerCount,
    paid_player_count: newPaidPlayerCount,
    trial_player_count: newTrialPlayerCount,
    prize_pool: newPrizePool,
    status: newStatus,
    start_time: newStartTime,
    players: newPlayers,
  };

  return activeSession!;
};

export const leaveActiveSession = (playerId: string): MemoryGameSession => {
  const session = getActiveSession();
  const now = Date.now();

  // Find and remove the player
  const playerIndex = session.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    // Player not found, return current session
    return session;
  }

  const leavingPlayer = session.players[playerIndex];
  const newPlayers = session.players.filter(p => p.id !== playerId);
  
  // Update player counts
  const newPaidPlayerCount = newPlayers.filter(p => p.isPaidPlayer).length;
  const newTrialPlayerCount = newPlayers.filter(p => !p.isPaidPlayer).length;
  const newPlayerCount = newPlayers.length;

  // Check if this was the last trial/paid player
  const wasLastTrialOrPaidPlayer = newPlayerCount === 0;
  
  // If it was the last player, reset the session to waiting state
  let newStatus = session.status;
  let newStartTime = session.start_time;
  let newPrizePool = session.prize_pool;
  
  if (wasLastTrialOrPaidPlayer) {
    // Reset session to waiting state
    newStatus = 'waiting';
    newStartTime = now;
    newPrizePool = 0; // Reset prize pool when game is cancelled
  } else if (leavingPlayer.isPaidPlayer && newPaidPlayerCount === 0) {
    // Last paid player left, but there are still trial players
    // Reset to waiting state until another paid player joins
    newStatus = 'waiting';
    newStartTime = now;
    newPrizePool = 0; // Reset prize pool when game is cancelled
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
  };

  return activeSession!;
};

export const getTimeRemainingSeconds = (session?: MemoryGameSession): number => {
  const s = session ?? getActiveSession();
  
  // If no paid players, show full time remaining (waiting state)
  if (s.paid_player_count === 0) {
    return FIVE_MINUTES_SECONDS;
  }
  
  // If session is not active, show full time remaining
  if (s.status !== 'active') {
    return FIVE_MINUTES_SECONDS;
  }
  
  const elapsed = Math.floor((Date.now() - s.start_time) / 1000);
  return Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
};
