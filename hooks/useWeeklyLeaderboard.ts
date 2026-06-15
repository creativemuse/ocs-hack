'use client';

import { useState, useEffect, useCallback } from 'react';
import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { Player } from '@/lib/spacetime/database';

const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

export interface WeeklyLeaderboardEntry {
  walletAddress: string;
  username?: string;
  avatarUrl?: string;
  bestScore: number;
  sessionCounter: number;
}

type JsonRpcResponse = {
  id: number;
  result?: string;
  error?: { message: string };
};

/** Batch multiple eth_call requests into a single HTTP round-trip. */
const rpcBatchEthCall = async (callData: `0x${string}`[]): Promise<string[]> => {
  if (callData.length === 0) return [];

  const payload = callData.map((data, index) => ({
    jsonrpc: '2.0',
    id: index + 1,
    method: 'eth_call',
    params: [{ to: TRIVIA_CONTRACT_ADDRESS, data }, 'latest'],
  }));

  const res = await fetch(BASE_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as JsonRpcResponse[];
  const sorted = [...json].sort((a, b) => a.id - b.id);

  return sorted.map((item, index) => {
    if (item.error) {
      throw new Error(item.error.message || `RPC batch call ${index + 1} failed`);
    }
    return item.result ?? '0x';
  });
};

const fetchWeeklyScoresFromChain = async (): Promise<{
  sessionCounter: number;
  entries: WeeklyLeaderboardEntry[];
}> => {
  const sessionCounterData = encodeFunctionData({
    abi: TRIVIA_ABI,
    functionName: 'sessionCounter',
  });
  const playersListData = encodeFunctionData({
    abi: TRIVIA_ABI,
    functionName: 'getCurrentPlayers',
  });

  const [sessionCounterRaw, playersRaw] = await rpcBatchEthCall([
    sessionCounterData,
    playersListData,
  ]);
  const sessionCounter = Number(BigInt(sessionCounterRaw));

  let players: `0x${string}`[] = [];
  if (playersRaw && playersRaw !== '0x') {
    players = decodeFunctionResult({
      abi: TRIVIA_ABI,
      functionName: 'getCurrentPlayers',
      data: playersRaw as `0x${string}`,
    }) as `0x${string}`[];
  }

  if (players.length === 0) {
    return { sessionCounter, entries: [] };
  }

  const scoreCallData = players.map((player) =>
    encodeFunctionData({
      abi: TRIVIA_ABI,
      functionName: 'getPlayerScore',
      args: [player],
    }),
  );

  const scoreRaws = await rpcBatchEthCall(scoreCallData);

  const entries = players
    .map((player, index) => ({
      walletAddress: player.toLowerCase(),
      bestScore: Number(BigInt(scoreRaws[index] ?? '0x0')),
      sessionCounter,
    }))
    .filter((entry) => entry.bestScore > 0)
    .sort((a, b) => b.bestScore - a.bestScore);

  return { sessionCounter, entries };
};

/**
 * Weekly leaderboard tied to the on-chain session counter.
 * Resets automatically when a new session opens after prize distribution.
 */
export const useWeeklyLeaderboard = (limit: number = 10) => {
  const { connection, isConnected } = useSpacetime();
  const [entries, setEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [sessionCounter, setSessionCounter] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  const mergePlayerMetadata = useCallback(
    (chainEntries: WeeklyLeaderboardEntry[]): WeeklyLeaderboardEntry[] => {
      if (!connection || !isConnected) {
        return chainEntries.slice(0, limit);
      }

      const playersByWallet = new Map<string, Player>();
      for (const player of Array.from(connection.db.players.iter()) as Player[]) {
        playersByWallet.set(player.walletAddress.toLowerCase(), player);
      }

      return chainEntries.slice(0, limit).map((entry) => {
        const player = playersByWallet.get(entry.walletAddress.toLowerCase());
        return {
          ...entry,
          username: player?.username ?? entry.username,
          avatarUrl: player?.avatarUrl,
        };
      });
    },
    [connection, isConnected, limit],
  );

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { sessionCounter: counter, entries: chainEntries } =
        await fetchWeeklyScoresFromChain();
      setSessionCounter(counter);
      setEntries(mergePlayerMetadata(chainEntries));
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Error fetching weekly leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weekly leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [mergePlayerMetadata]);

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
      setEntries((prev) => mergePlayerMetadata(prev));
    };

    connection.db.players.onInsert(handlePlayerChange);
    connection.db.players.onUpdate(handlePlayerChange);

    return () => {
      connection.db.players.removeOnInsert(handlePlayerChange);
      connection.db.players.removeOnUpdate(handlePlayerChange);
    };
  }, [connection, isConnected, mergePlayerMetadata]);

  return {
    entries,
    sessionCounter,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
};
