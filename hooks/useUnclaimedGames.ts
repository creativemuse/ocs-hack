'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

export interface UnclaimedGame {
  sessionId: bigint;
  prizeAmount: string;
  ranking: number;
  prizePool: string;
  playerCount: number;
  isActive: boolean;
}

/**
 * NOTE: TriviaBattle.sol is session-based and does NOT store history of past sessions.
 * This hook can only check the current session. Past sessions are not queryable on-chain.
 * Prizes are automatically distributed when distributePrizes() is called - there's no claim function.
 */
export function useUnclaimedGames(maxGamesToCheck: number = 10) {
  const { address, isConnected } = useAccount();
  const [unclaimedGames, setUnclaimedGames] = useState<UnclaimedGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current session counter
  const { data: sessionCounter, isLoading: isLoadingSessionId } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'sessionCounter',
  });

  // Read current session info
  const { data: isSessionActive } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'isSessionActive',
  });

  const { data: currentSessionPrizePool } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'currentSessionPrizePool',
  });

  const { data: currentPlayers } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getCurrentPlayers',
  });

  const { data: playerScore } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getPlayerScore',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Check current session only (past sessions are not stored on-chain)
  useEffect(() => {
    if (!address || !isConnected || !sessionCounter) {
      setUnclaimedGames([]);
      return;
    }

    setIsLoading(true);
    try {
      const playersList = (currentPlayers as `0x${string}`[] | undefined) || [];
      const isPlayerInSession = playersList.includes(address as `0x${string}`);
      const sessionActive = Boolean(isSessionActive ?? false);
      const prizePool = currentSessionPrizePool?.toString() || '0';
      const score = playerScore || BigInt(0);

      // NOTE: TriviaBattle.sol doesn't store past sessions
      // We can only check the current session
      // Prizes are automatically distributed - there's no claim function
      if (isPlayerInSession && !sessionActive && score > BigInt(0)) {
        // Session ended, player participated, prizes should have been distributed
        // Check wallet for USDC transfers instead of checking "claimed" status
        setUnclaimedGames([{
          sessionId: sessionCounter,
          prizeAmount: '0', // Can't calculate without all player scores
          ranking: 0, // Can't determine without all player scores
          prizePool,
          playerCount: playersList.length,
          isActive: false,
        }]);
      } else {
        setUnclaimedGames([]);
      }
    } catch (err) {
      console.error('Error processing unclaimed games:', err);
      setError(err instanceof Error ? err.message : 'Failed to process unclaimed games');
      setUnclaimedGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, sessionCounter, isSessionActive, currentSessionPrizePool, currentPlayers, playerScore]);

  return {
    unclaimedGames,
    isLoading: isLoading || isLoadingSessionId,
    error,
    refresh: () => {
      // Trigger a refetch by updating dependencies
      setUnclaimedGames([]);
    },
  };
}
