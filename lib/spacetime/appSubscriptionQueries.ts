/**
 * Shared subscription queries for the app cache.
 * Partitions `players` into three disjoint index-friendly predicates (covers all rows).
 * `active_connections` uses last_activity >= epoch so the server can use the btree on last_activity.
 * `active_game_sessions` is partitioned by `status` to use idx_active_game_sessions_status.
 */
import { Timestamp } from 'spacetimedb';

import { tables } from './index';

/** Same object shape `subscriptionBuilder().subscribe(fn)` passes at runtime; SDK types it loosely. */
export type AppSubscriptionTables = typeof tables;

/** All player rows via three disjoint predicates (safe for server-side profile lookups). */
export const buildPlayerLookupSubscriptionQueries = (t: AppSubscriptionTables) => [
  t.players.where((row) => row.totalEarnings.gt(0)),
  t.players.where((row) =>
    row.totalEarnings.eq(0).and(row.gamesPlayed.gt(0))
  ),
  t.players.where((row) =>
    row.totalEarnings.eq(0).and(row.gamesPlayed.eq(0))
  ),
];

/** Index-friendly full-table coverage for active_game_sessions (one predicate per status). */
export const buildActiveGameSessionSubscriptionQueries = (t: AppSubscriptionTables) => [
  t.active_game_sessions.where((row) =>
    row.status.eq({ tag: 'Waiting' } as never),
  ),
  t.active_game_sessions.where((row) =>
    row.status.eq({ tag: 'Lobby' } as never),
  ),
  t.active_game_sessions.where((row) =>
    row.status.eq({ tag: 'Active' } as never),
  ),
  t.active_game_sessions.where((row) =>
    row.status.eq({ tag: 'Completed' } as never),
  ),
];

export const buildAppSubscriptionQueries = (t: AppSubscriptionTables) => [
  ...buildPlayerLookupSubscriptionQueries(t),
  t.game_sessions,
  t.player_stats,
  ...buildActiveGameSessionSubscriptionQueries(t),
  t.pool_players,
  t.pending_claims,
  t.audio_files,
  t.active_connections.where((row) =>
    row.lastActivity.gte(Timestamp.UNIX_EPOCH)
  ),
  t.identity_wallet_mapping,
  t.social_identity,
];

/** Minimal subscriptions for serverless `/api/game-session` — avoids long initial sync (504 on Vercel). */
export const buildGameSessionOnlySubscriptionQueries = (t: AppSubscriptionTables) => [
  ...buildActiveGameSessionSubscriptionQueries(t),
  t.pool_players,
];

/** Trial status lookups on server routes (`/api/trial-status`). */
export const buildTrialStatusSubscriptionQueries = (t: AppSubscriptionTables) => [
  ...buildPlayerLookupSubscriptionQueries(t),
  t.anonymous_sessions,
];
