'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { Player } from '@/lib/spacetime/database';
import {
  type WeeklyLeaderboardEntry,
  mergeWeeklyLeaderboardEntries,
  enrichWeeklyEntriesWithMetadata,
} from '@/lib/game/weeklyLeaderboard';

export type { WeeklyLeaderboardEntry };

const toSpacetimeRows = (players: Player[]) =>
  players.map((p) => ({
    walletAddress: p.walletAddress,
    username: p.username,
    avatarUrl: p.avatarUrl,
    weeklySessionId: p.weeklySessionId,
    weeklyBestScore: p.weeklyBestScore,
    totalEarnings: p.totalEarnings,
  }));

/**
 * Weekly leaderboard tied to the on-chain session counter.
 * Merges on-chain scores with SpacetimeDB weekly session scores.
 *
 * Reads authoritative data from /api/weekly-leaderboard first (server-side merge),
 * then keeps the local SpacetimeDB cache in sync for real-time updates.
 */
export const useWeeklyLeaderboard = (limit: number = 10) => {
  const { connection, isConnected } = useSpacetime();
  const [entries, setEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [sessionCounter, setSessionCounter] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  const hasLoadedRef = useRef(false);

  const buildEntriesFromCache = useCallback(
    (
      counter: number,
      serverEntries: WeeklyLeaderboardEntry[],
    ): WeeklyLeaderboardEntry[] => {
      if (!connection || !isConnected) {
        return serverEntries;
      }

      const spacetimePlayers = toSpacetimeRows(
        Array.from(connection.db.players.iter()) as Player[],
      );

      // Seed the merge with server entries as the "chain" source so newer local rows
      // can enrich/update them, while preserving any server-only rows the cache lacks.
      const serverChainScores = new Map(
        serverEntries.map((e) => [e.walletAddress.toLowerCase(), e.bestScore]),
      );

      const merged = mergeWeeklyLeaderboardEntries(
        counter,
        serverChainScores,
        spacetimePlayers,
        limit,
      );

      return enrichWeeklyEntriesWithMetadata(merged, spacetimePlayers, limit);
    },
    [connection, isConnected, limit],
  );

  const fetchFromServer = useCallback(async (): Promise<{
    counter: number;
    serverEntries: WeeklyLeaderboardEntry[];
  }> => {
    const res = await fetch(`/api/weekly-leaderboard?limit=${limit}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server leaderboard failed (${res.status})`);
    }
    const data = await res.json();
    return {
      counter: Number(data.sessionCounter) || 0,
      serverEntries: Array.isArray(data.entries) ? data.entries : [],
    };
  }, [limit]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      if (hasLoadedRef.current) {
        setIsRefreshing(true);
      }

      const { counter, serverEntries } = await fetchFromServer();
      setSessionCounter(counter);
      setEntries(buildEntriesFromCache(counter, serverEntries));
      setLastUpdated(Date.now());
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error fetching weekly leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weekly leaderboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchFromServer, buildEntriesFromCache]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!connection || !isConnected) return;

    const handlePlayerChange = () => {
      void refresh();
    };

    connection.db.players.onInsert(handlePlayerChange);
    connection.db.players.onUpdate(handlePlayerChange);

    return () => {
      connection.db.players.removeOnInsert(handlePlayerChange);
      connection.db.players.removeOnUpdate(handlePlayerChange);
    };
  }, [connection, isConnected, refresh]);

  return {
    entries,
    sessionCounter,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh,
  };
};
