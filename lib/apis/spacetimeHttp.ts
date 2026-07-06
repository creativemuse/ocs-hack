/**
 * SpacetimeDB HTTP client for serverless (Vercel).
 * Avoids WebSocket subscriptions which fail in stateless functions.
 */

import type { GameSession, GuestPlayer, Player } from '@/lib/spacetime/types';

const SPACETIME_HOST =
  process.env.SPACETIME_HOST ||
  process.env.NEXT_PUBLIC_SPACETIME_HOST ||
  'https://maincloud.spacetimedb.com';

const SPACETIME_DATABASE =
  process.env.SPACETIME_DATABASE ||
  process.env.NEXT_PUBLIC_SPACETIME_DATABASE ||
  process.env.SPACETIME_MODULE ||
  process.env.NEXT_PUBLIC_SPACETIME_MODULE ||
  'beat-me';

const SPACETIME_TOKEN = process.env.SPACETIME_TOKEN?.trim();

const baseUrl = `${SPACETIME_HOST}/v1/database/${SPACETIME_DATABASE}`;

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (SPACETIME_TOKEN) {
  headers.Authorization = `Bearer ${SPACETIME_TOKEN}`;
}

export const isSpacetimeHttpConfigured = (): boolean =>
  Boolean(
    (process.env.SPACETIME_HOST || process.env.NEXT_PUBLIC_SPACETIME_HOST) &&
      (process.env.SPACETIME_DATABASE ||
        process.env.NEXT_PUBLIC_SPACETIME_DATABASE ||
        process.env.SPACETIME_MODULE ||
        process.env.NEXT_PUBLIC_SPACETIME_MODULE),
  );

const pick = <T>(row: Record<string, unknown>, camel: string, snake: string): T =>
  (row[camel] ?? row[snake]) as T;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toBigInt = (value: unknown, fallback = BigInt(0)): bigint => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.floor(value));
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const toBool = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const str = String(value);
  return str.length > 0 ? str : undefined;
};

export const getTimestampMicros = (ts: unknown): number => {
  if (ts === null || ts === undefined) return 0;
  if (typeof ts === 'object' && ts !== null) {
    const record = ts as Record<string, unknown>;
    if ('microsSinceUnixEpoch' in record) {
      return toNumber(record.microsSinceUnixEpoch);
    }
    if ('micros_since_unix_epoch' in record) {
      return toNumber(record.micros_since_unix_epoch);
    }
  }
  return toNumber(ts);
};

export const isPaidPlayerType = (playerType: unknown): boolean => {
  if (playerType === null || playerType === undefined) return false;
  if (typeof playerType === 'string') return playerType === 'Paid';
  if (typeof playerType === 'object') {
    const record = playerType as Record<string, unknown>;
    if ('tag' in record) return record.tag === 'Paid';
    return 'Paid' in record;
  }
  return false;
};

export const mapSqlPlayerRow = (row: Record<string, unknown>): Player => ({
  walletAddress: String(pick(row, 'walletAddress', 'wallet_address') ?? ''),
  username: toOptionalString(pick(row, 'username', 'username')),
  avatarUrl: toOptionalString(pick(row, 'avatarUrl', 'avatar_url')),
  totalScore: toNumber(pick(row, 'totalScore', 'total_score')),
  gamesPlayed: toNumber(pick(row, 'gamesPlayed', 'games_played')),
  bestScore: toNumber(pick(row, 'bestScore', 'best_score')),
  totalEarnings: toNumber(pick(row, 'totalEarnings', 'total_earnings')),
  trialGamesRemaining: toNumber(pick(row, 'trialGamesRemaining', 'trial_games_remaining')),
  trialCompleted: toBool(pick(row, 'trialCompleted', 'trial_completed')),
  walletConnected: toBool(pick(row, 'walletConnected', 'wallet_connected')),
  weeklySessionId: toBigInt(pick(row, 'weeklySessionId', 'weekly_session_id')),
  weeklyBestScore: toNumber(pick(row, 'weeklyBestScore', 'weekly_best_score')),
  createdAt: pick(row, 'createdAt', 'created_at') as Player['createdAt'],
  updatedAt: pick(row, 'updatedAt', 'updated_at') as Player['updatedAt'],
});

export const mapSqlGameSessionRow = (row: Record<string, unknown>): GameSession => ({
  id: toBigInt(pick(row, 'id', 'id')),
  sessionId: String(pick(row, 'sessionId', 'session_id') ?? ''),
  gameId: String(pick(row, 'gameId', 'game_id') ?? ''),
  walletAddress: toOptionalString(pick(row, 'walletAddress', 'wallet_address')),
  guestId: toOptionalString(pick(row, 'guestId', 'guest_id')),
  spacetimeIdentity: pick(row, 'spacetimeIdentity', 'spacetime_identity') as GameSession['spacetimeIdentity'],
  playerType: pick(row, 'playerType', 'player_type') as GameSession['playerType'],
  score: toNumber(pick(row, 'score', 'score')),
  questionsAnswered: toNumber(pick(row, 'questionsAnswered', 'questions_answered')),
  correctAnswers: toNumber(pick(row, 'correctAnswers', 'correct_answers')),
  startedAt: pick(row, 'startedAt', 'started_at') as GameSession['startedAt'],
  endedAt: pick(row, 'endedAt', 'ended_at') as GameSession['endedAt'],
  difficulty: String(pick(row, 'difficulty', 'difficulty') ?? ''),
  gameMode: String(pick(row, 'gameMode', 'game_mode') ?? ''),
});

export const mapSqlGuestPlayerRow = (row: Record<string, unknown>): GuestPlayer => ({
  guestId: String(pick(row, 'guestId', 'guest_id') ?? ''),
  name: String(pick(row, 'name', 'name') ?? ''),
  playerType: pick(row, 'playerType', 'player_type') as GuestPlayer['playerType'],
  gamesPlayed: toNumber(pick(row, 'gamesPlayed', 'games_played')),
  totalScore: toNumber(pick(row, 'totalScore', 'total_score')),
  bestScore: toNumber(pick(row, 'bestScore', 'best_score')),
  achievements: String(pick(row, 'achievements', 'achievements') ?? ''),
  createdAt: pick(row, 'createdAt', 'created_at') as GuestPlayer['createdAt'],
  lastPlayed: pick(row, 'lastPlayed', 'last_played') as GuestPlayer['lastPlayed'],
});

export async function callReducer(reducer: string, args: unknown): Promise<void> {
  const res = await fetch(`${baseUrl}/call/${reducer}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SpacetimeDB reducer ${reducer} failed: ${res.status} ${text}`);
  }
}

export async function querySql<T = unknown>(sql: string): Promise<T[]> {
  const res = await fetch(`${baseUrl}/sql`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'text/plain',
    },
    body: sql,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SpacetimeDB SQL failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.flatMap((stmt) => {
      if (stmt && typeof stmt === 'object' && 'rows' in stmt) {
        return (stmt as { rows: T[] }).rows ?? [];
      }
      return stmt as T;
    });
  }
  return (data && typeof data === 'object' && 'rows' in data)
    ? (data as { rows: T[] }).rows ?? []
    : [];
}
