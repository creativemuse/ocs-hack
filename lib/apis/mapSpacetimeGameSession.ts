import type { GameSession, GameSessionPlayer } from '@/hooks/useGameSession';
import type { ActiveGameSession, PoolPlayer } from '@/lib/spacetime/types';
import { Timestamp } from 'spacetimedb';

const FIVE_MIN_SECONDS = 300;

/** SpacetimeDB timestamps are microseconds since UNIX epoch; client session uses ms (Date.now()). */
export const timestampToMs = (ts: Timestamp | bigint | undefined | null): number => {
  if (ts == null) return 0;
  const k = BigInt(1000);
  if (typeof ts === 'bigint') return Number(ts / k);
  if (ts instanceof Timestamp) return Number(ts.microsSinceUnixEpoch / k);
  if (typeof ts === 'object' && ts !== null && 'microsSinceUnixEpoch' in ts) {
    return Number((ts as Timestamp).microsSinceUnixEpoch / k);
  }
  return 0;
};

export const sessionStatusTag = (
  status: ActiveGameSession['status']
): 'Waiting' | 'Lobby' | 'Active' | 'Completed' => {
  if (typeof status === 'object' && status !== null && 'tag' in status) {
    const t = (status as { tag: string }).tag;
    if (t === 'Waiting' || t === 'Lobby' || t === 'Active' || t === 'Completed') {
      return t;
    }
  }
  return 'Waiting';
};

const unwrapOptionTimestamp = (opt: ActiveGameSession['lobbyUntil']): Timestamp | null => {
  if (opt == null) return null;
  const o = opt as { tag?: string; value?: unknown };
  const tag = o.tag?.toLowerCase();
  if (tag === 'none') return null;
  if (tag === 'some' && o.value != null) return o.value as Timestamp;
  if (typeof opt === 'object' && opt !== null && 'microsSinceUnixEpoch' in opt) {
    return opt as Timestamp;
  }
  return null;
};

export const pickCurrentActiveGameSession = (rows: ActiveGameSession[]): ActiveGameSession | null => {
  const live = rows.filter((r) => {
    const t = sessionStatusTag(r.status);
    return t === 'Waiting' || t === 'Lobby' || t === 'Active';
  });
  if (live.length === 0) return null;
  return live.reduce((best, r) =>
    timestampToMs(r.createdAt) >= timestampToMs(best.createdAt) ? r : best
  );
};

const mapStatusToClient = (status: ActiveGameSession['status']): GameSession['status'] => {
  const t = sessionStatusTag(status);
  const m: Record<string, GameSession['status']> = {
    Waiting: 'waiting',
    Lobby: 'lobby',
    Active: 'active',
    Completed: 'completed',
  };
  return m[t] ?? 'waiting';
};

export const mapPoolRowsToPlayers = (pool: PoolPlayer[]): GameSessionPlayer[] =>
  pool.map((p) => ({
    id: p.playerId,
    isPaidPlayer: p.isPaid,
    joinedAt: timestampToMs(p.joinedAt),
    playerType: p.isPaid ? ('paid' as const) : ('trial' as const),
    walletAddress: p.walletAddress ?? undefined,
  }));

export const mapActiveRowToGameSession = (row: ActiveGameSession, pool: PoolPlayer[]): GameSession => {
  const lobbyTs = unwrapOptionTimestamp(row.lobbyUntil);
  const lobbyUntilMs = lobbyTs ? timestampToMs(lobbyTs) : null;

  return {
    session_id: row.sessionId,
    status: mapStatusToClient(row.status),
    player_count: row.playerCount,
    paid_player_count: row.paidPlayerCount,
    trial_player_count: row.trialPlayerCount,
    prize_pool: row.prizePool,
    entry_fee: row.entryFee,
    start_time: timestampToMs(row.startTime),
    created_at: timestampToMs(row.createdAt),
    players: mapPoolRowsToPlayers(pool),
    lobby_until_ms: lobbyUntilMs,
  };
};

export type SpacetimeGameSessionApiPayload = {
  session: GameSession;
  timeRemaining: number;
  lobbyTimeRemaining: number;
  inLobby: boolean;
  canJoin: boolean;
  waitingForPaidPlayer: boolean;
  source: 'spacetime';
  isFirstPaidPlayer?: boolean;
};

export const buildSpacetimeGameSessionApiPayload = (
  row: ActiveGameSession,
  pool: PoolPlayer[],
  opts?: { isFirstPaidPlayer?: boolean }
): SpacetimeGameSessionApiPayload => {
  const session = mapActiveRowToGameSession(row, pool);
  const now = Date.now();
  const st = session.status;

  let timeRemaining = 0;
  if (st === 'lobby') {
    timeRemaining = 0;
  } else if (session.paid_player_count === 0) {
    timeRemaining = FIVE_MIN_SECONDS;
  } else if (st !== 'active') {
    timeRemaining = FIVE_MIN_SECONDS;
  } else {
    const elapsed = Math.floor((now - session.start_time) / 1000);
    timeRemaining = Math.max(0, FIVE_MIN_SECONDS - elapsed);
  }

  let lobbyTimeRemaining = 0;
  if (st === 'lobby' && session.lobby_until_ms != null) {
    lobbyTimeRemaining = Math.max(0, Math.ceil((session.lobby_until_ms - now) / 1000));
  }

  const inLobby = st === 'lobby';
  const isWaiting = st === 'waiting';
  const isLobbyOpen = inLobby && lobbyTimeRemaining > 0;
  const isActiveWithTime = st === 'active' && session.paid_player_count > 0 && timeRemaining > 0;
  const hasNoPaidPlayers = session.paid_player_count === 0;
  const canJoin = isWaiting || isLobbyOpen || isActiveWithTime || hasNoPaidPlayers;
  const waitingForPaidPlayer = session.paid_player_count === 0 && !inLobby;

  return {
    session,
    timeRemaining,
    lobbyTimeRemaining,
    inLobby,
    canJoin,
    waitingForPaidPlayer,
    source: 'spacetime',
    ...(opts?.isFirstPaidPlayer !== undefined ? { isFirstPaidPlayer: opts.isFirstPaidPlayer } : {}),
  };
};

export const isFirstPaidPlayerAfterJoin = (
  row: ActiveGameSession,
  wasPaidJoin: boolean
): boolean => {
  if (!wasPaidJoin) return false;
  const tag = sessionStatusTag(row.status);
  return row.paidPlayerCount === 1 && (tag === 'Active' || tag === 'Lobby');
};
