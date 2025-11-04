'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

export interface UnclaimedGame {
  gameId: bigint;
  prizeAmount: string;
  ranking: number;
  prizePool: string;
  playerCount: number;
  endTime: bigint;
  isFinalized: boolean;
}

export function useUnclaimedGames(maxGamesToCheck: number = 10) {
  const { address, isConnected } = useAccount();
  const [unclaimedGames, setUnclaimedGames] = useState<UnclaimedGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current game ID
  const { data: currentGameId, isLoading: isLoadingGameId } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'currentGameId',
  });

  // Generate game IDs to check (last N games before current)
  const gameIdsToCheck = useMemo(() => {
    if (!currentGameId) return [];
    const currentId = Number(currentGameId);
    const startGameId = Math.max(1, currentId - maxGamesToCheck);
    const gameIds: bigint[] = [];
    for (let i = startGameId; i < currentId; i++) {
      gameIds.push(BigInt(i));
    }
    return gameIds;
  }, [currentGameId, maxGamesToCheck]);

  // Create contract calls for all games we want to check
  const contractCalls = useMemo(() => {
    if (!address || !isConnected || gameIdsToCheck.length === 0) return [];

    const calls: any[] = [];
    
    // For each game, check:
    // 1. hasPlayerEntered
    // 2. hasPlayerClaimed  
    // 3. getGameInfo
    // 4. getPlayerRanking
    // 5. calculatePrize (if ranked)
    
    gameIdsToCheck.forEach((gameId) => {
      // Check if player entered
      calls.push({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'hasPlayerEntered' as const,
        args: [gameId, address],
      });
      
      // Check if player claimed
      calls.push({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'hasPlayerClaimed' as const,
        args: [gameId, address],
      });
      
      // Get game info
      calls.push({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'getGameInfo' as const,
        args: [gameId],
      });
      
      // Get player ranking
      calls.push({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'getPlayerRanking' as const,
        args: [gameId, address],
      });
    });

    return calls;
  }, [address, isConnected, gameIdsToCheck]);

  // Execute all contract reads in parallel
  const { data: contractResults, isLoading: isLoadingCalls } = useReadContracts({
    contracts: contractCalls,
    query: {
      enabled: contractCalls.length > 0 && !!address && isConnected,
    },
  });

  // Process results when contract calls complete
  useEffect(() => {
    if (!contractResults || contractResults.length === 0 || !gameIdsToCheck.length) {
      setUnclaimedGames([]);
      return;
    }

    setIsLoading(true);
    try {
      const games: UnclaimedGame[] = [];
      const callsPerGame = 4; // hasEntered, hasClaimed, gameInfo, ranking

      gameIdsToCheck.forEach((gameId, gameIndex) => {
        const baseIndex = gameIndex * callsPerGame;
        
        const hasEntered = contractResults[baseIndex]?.result as boolean;
        const hasClaimed = contractResults[baseIndex + 1]?.result as boolean;
        const gameInfo = contractResults[baseIndex + 2]?.result as readonly [bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean, number] | undefined;
        const ranking = contractResults[baseIndex + 3]?.result as bigint | undefined;

        // Skip if player didn't enter or already claimed
        if (!hasEntered || hasClaimed || !gameInfo || !ranking) {
          return;
        }

        const [prizePool, , playerCount, , endTime, , isFinalized] = gameInfo;
        const rankingNum = Number(ranking);

        // Only include if player has a ranking (was ranked) and game is finalized
        if (rankingNum > 0 && isFinalized) {
          // Calculate prize amount
          // We need to call calculatePrize, but for now we'll estimate based on ranking
          // In a production app, you'd want to batch calculatePrize calls too
          const prizeAmount = '0'; // Will be calculated separately if needed

          games.push({
            gameId,
            prizeAmount,
            ranking: rankingNum,
            prizePool: prizePool.toString(),
            playerCount: Number(playerCount),
            endTime,
            isFinalized,
          });
        }
      });

      setUnclaimedGames(games);
    } catch (err) {
      console.error('Error processing unclaimed games:', err);
      setError(err instanceof Error ? err.message : 'Failed to process unclaimed games');
    } finally {
      setIsLoading(false);
    }
  }, [contractResults, gameIdsToCheck]);

  // Calculate prize amounts for each game using useReadContracts
  const prizeCalculationCalls = useMemo(() => {
    if (unclaimedGames.length === 0) return [];
    
    return unclaimedGames.map((game) => ({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'calculatePrize' as const,
      args: [game.gameId, BigInt(game.ranking)],
    }));
  }, [unclaimedGames]);

  const { data: prizeResults } = useReadContracts({
    contracts: prizeCalculationCalls,
    query: {
      enabled: prizeCalculationCalls.length > 0,
    },
  });

  // Update games with calculated prize amounts
  const previousPrizeResults = useRef<string>('');
  useEffect(() => {
    if (!prizeResults || prizeResults.length === 0) return;

    const prizeResultsString = JSON.stringify(prizeResults.map(r => r.result?.toString()));
    if (prizeResultsString === previousPrizeResults.current) return;
    previousPrizeResults.current = prizeResultsString;

    setUnclaimedGames((prevGames) => {
      if (prevGames.length === 0 || prevGames.length !== prizeResults.length) return prevGames;
      
      return prevGames.map((game, index) => {
        const prizeResult = prizeResults[index]?.result as bigint | undefined;
        const prizeAmount = prizeResult?.toString() || '0';
        
        return {
          ...game,
          prizeAmount,
        };
      });
    });
  }, [prizeResults]); // Only update when prize results change

  return {
    unclaimedGames,
    isLoading: isLoading || isLoadingGameId || isLoadingCalls,
    error,
    refresh: () => {
      // Trigger a refetch by updating dependencies
      setUnclaimedGames([]);
    },
  };
}
