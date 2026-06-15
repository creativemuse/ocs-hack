'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

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
      const { sessionCounter: counter, chainScores } =
        await fetchWeeklyScoresFromChain();
      setSessionCounter(counter);
      setEntries(buildMergedEntries(counter, chainScores));
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Error fetching weekly leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weekly leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [buildMergedEntries]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!connection || !isConnected) return;

    const handlePlayerChange = () => {
      setEntries((prev) => {
        if (sessionCounter === 0) return prev;
        const chainScores = new Map(
          prev.map((e) => [e.walletAddress.toLowerCase(), e.bestScore]),
        );
        return buildMergedEntries(sessionCounter, chainScores);
      });
    };

    connection.db.players.onInsert(handlePlayerChange);
    connection.db.players.onUpdate(handlePlayerChange);

    return () => {
      connection.db.players.removeOnInsert(handlePlayerChange);
      connection.db.players.removeOnUpdate(handlePlayerChange);
    };
  }, [connection, isConnected, sessionCounter, buildMergedEntries]);

  return {
    entries,
    sessionCounter,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
};
