'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { Player } from '@/lib/spacetime/database';
import {
  type WeeklyLeaderboardEntry,
  fetchWeeklyScoresFromChain,
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

  const buildMergedEntries = useCallback(
    (
      counter: number,
      chainScores: Map<string, number>,
    ): WeeklyLeaderboardEntry[] => {
      const spacetimePlayers =
        connection && isConnected
          ? toSpacetimeRows(Array.from(connection.db.players.iter()) as Player[])
          : [];

      const merged = mergeWeeklyLeaderboardEntries(
        counter,
        chainScores,
        spacetimePlayers,
        limit,
      );

      return enrichWeeklyEntriesWithMetadata(merged, spacetimePlayers, limit);
    },
    [connection, isConnected, limit],
  );

  const refresh = useCallback(async () => {
    try {
      setError(null);
      if (hasLoadedRef.current) {
        setIsRefreshing(true);
      }
      const { sessionCounter: counter, chainScores } =
        await fetchWeeklyScoresFromChain();
      setSessionCounter(counter);
      setEntries(buildMergedEntries(counter, chainScores));
      setLastUpdated(Date.now());
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error fetching weekly leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weekly leaderboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buildMergedEntries]);

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
