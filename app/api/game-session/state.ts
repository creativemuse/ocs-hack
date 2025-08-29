type SessionStatus = 'waiting' | 'active' | 'completed';

export interface MemoryGameSession {
  session_id: string;
  status: SessionStatus;
  player_count: number;
  prize_pool: number;
  entry_fee: number;
  start_time: number; // ms epoch
  created_at: number; // ms epoch
}

const FIVE_MINUTES_SECONDS = 300;

let activeSession: MemoryGameSession | null = null;

const createWaitingSession = (): MemoryGameSession => {
  const now = Date.now();
  return {
    session_id: `session_${now}`,
    status: 'waiting',
    player_count: 0,
    prize_pool: 100,
    entry_fee: 1,
    start_time: now,
    created_at: now,
  };
};

export const getActiveSession = (): MemoryGameSession => {
  if (!activeSession) {
    activeSession = createWaitingSession();
  }
  return activeSession;
};

export const joinActiveSession = (): MemoryGameSession => {
  const session = getActiveSession();
  const isFirst = session.player_count === 0;
  const now = Date.now();

  activeSession = {
    ...session,
    player_count: session.player_count + 1,
    status: isFirst ? 'active' as SessionStatus : session.status,
    start_time: isFirst ? now : session.start_time,
  };

  return activeSession!;
};

export const getTimeRemainingSeconds = (session?: MemoryGameSession): number => {
  const s = session ?? getActiveSession();
  if (s.status !== 'active') return FIVE_MINUTES_SECONDS;
  const elapsed = Math.floor((Date.now() - s.start_time) / 1000);
  return Math.max(0, FIVE_MINUTES_SECONDS - elapsed);
};
