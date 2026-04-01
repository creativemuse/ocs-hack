/**
 * Shared subscription queries for the app cache.
 * Partitions `players` into three disjoint index-friendly predicates (covers all rows).
 * `active_connections` uses last_activity >= epoch so the server can use the btree on last_activity.
 */
import { Timestamp } from 'spacetimedb';

import { tables } from './index';

/** Same object shape `subscriptionBuilder().subscribe(fn)` passes at runtime; SDK types it loosely. */
export type AppSubscriptionTables = typeof tables;

export const buildAppSubscriptionQueries = (t: AppSubscriptionTables) => [
  t.players.where((row) => row.totalEarnings.gt(0)),
  t.players.where((row) =>
    row.totalEarnings.eq(0).and(row.gamesPlayed.gt(0))
  ),
  t.players.where((row) =>
    row.totalEarnings.eq(0).and(row.gamesPlayed.eq(0))
  ),
  t.game_sessions,
  t.player_stats,
  t.active_game_sessions,
  t.pending_claims,
  t.audio_files,
  t.active_connections.where((row) =>
    row.lastActivity.gte(Timestamp.UNIX_EPOCH)
  ),
  t.identity_wallet_mapping,
];
