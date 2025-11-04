'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

export interface PlayerWinnings {
  hasWinnings: boolean;
  winningAmount: string;
  hasClaimed: boolean;
  isEligible: boolean;
  rank?: number;
  totalPrizePool: string;
  sessionActive: boolean;
  isPaidPlayer: boolean; // Track if player paid entry fee
}

export function usePlayerWinnings() {
  const { address, isConnected } = useAccount();
  const [winnings, setWinnings] = useState<PlayerWinnings>({
    hasWinnings: false,
    winningAmount: '0',
    hasClaimed: false,
    isEligible: false,
    totalPrizePool: '0',
    sessionActive: false,
    isPaidPlayer: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read current game info to get prize pool and session status
  const { data: currentGameId } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'currentGameId',
  });

  const { data: sessionInfo, isLoading: sessionLoading } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getGameInfo',
    args: currentGameId ? [currentGameId] : undefined,
    query: {
      enabled: !!currentGameId,
    },
  });

  // Read player ranking (for paid players only)
  const { data: playerRanking, isLoading: scoreLoading } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getPlayerRanking',
    args: currentGameId && address ? [currentGameId, address] : undefined,
    query: {
      enabled: !!currentGameId && !!address && isConnected,
    },
  });

  // Check if player has already claimed their prize
  const { data: hasClaimedFromContract } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'hasPlayerClaimed',
    args: currentGameId && address ? [currentGameId, address] : undefined,
    query: {
      enabled: !!currentGameId && !!address && isConnected,
    },
  });

  // Get prize amount from contract using calculatePrize
  const { data: calculatedPrize } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'calculatePrize',
    args: currentGameId && playerRanking && playerRanking > BigInt(0) ? [currentGameId, playerRanking] : undefined,
    query: {
      enabled: !!currentGameId && !!playerRanking && playerRanking > BigInt(0),
    },
  });

  // Calculate winnings based on score and prize pool
  const calculateWinnings = useCallback(async () => {
    if (!address || !isConnected || !sessionInfo || !playerRanking) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [prizePool, platformFee, playerCount, startTime, endTime, isActive, isFinalized, rankingsSubmitted, chainlinkMode] = sessionInfo as readonly [bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean, number];
      
      // Check if session is active and prizes have been distributed
      const sessionActive = isActive;
      const gameFinalized = isFinalized;
      const totalPrizePool = prizePool.toString();
      
      // Get player's ranking (0 means not ranked)
      const ranking = playerRanking as bigint;
      
      // Check if player has already claimed (from contract)
      const hasClaimed = hasClaimedFromContract || false;
      
      // Check if player is ranked (ranking > 0 means they participated and are ranked)
      // Trial players should never be able to claim winnings
      if (ranking === BigInt(0)) {
        setWinnings({
          hasWinnings: false,
          winningAmount: '0',
          hasClaimed: false,
          isEligible: false,
          totalPrizePool,
          sessionActive,
          isPaidPlayer: false, // No ranking = not a paid player
        });
        return;
      }

      // If player has a ranking, they must be a paid player (trial players are not ranked)
      const isPaidPlayer = ranking > BigInt(0);
      
      // Trial players are completely excluded from winnings
      if (!isPaidPlayer) {
        setWinnings({
          hasWinnings: false,
          winningAmount: '0',
          hasClaimed: false,
          isEligible: false,
          totalPrizePool,
          sessionActive,
          isPaidPlayer: false,
        });
        return;
      }

      // Prize distribution logic for paid players only
      const playerRankingNum = Number(ranking);
      const totalPlayers = Number(playerCount);
      const totalPrizePoolNum = Number(prizePool);
      
      // Use calculated prize from contract if available, otherwise calculate estimate
      let winningAmount = '0';
      let rank = playerRankingNum;
      let isEligible = false;
      
      // If game is finalized, use the actual calculated prize from contract
      if (gameFinalized && calculatedPrize !== undefined) {
        winningAmount = calculatedPrize.toString();
        isEligible = calculatedPrize > BigInt(0) && !hasClaimed;
      } else if (playerRankingNum > 0 && totalPlayers > 0 && totalPrizePoolNum > 0) {
        // For active games, show estimated winnings based on ranking
        // Prize distribution tiers (customize these based on your game rules)
        if (playerRankingNum === 1) { // Top tier - 1st place
          winningAmount = Math.floor(totalPrizePoolNum * 0.5).toString(); // 50% of total prize pool
          isEligible = true;
        } else if (playerRankingNum === 2) { // Second tier - 2nd place
          winningAmount = Math.floor(totalPrizePoolNum * 0.3).toString(); // 30% of total prize pool
          isEligible = true;
        } else if (playerRankingNum === 3) { // Third tier - 3rd place
          winningAmount = Math.floor(totalPrizePoolNum * 0.15).toString(); // 15% of total prize pool
          isEligible = true;
        } else if (playerRankingNum <= 10) { // Fourth tier - participation prize
          winningAmount = Math.floor(totalPrizePoolNum * 0.05).toString(); // 5% of total prize pool
          isEligible = true;
        } else if (playerRankingNum <= 20) { // Fifth tier - small participation prize
          winningAmount = Math.floor(totalPrizePoolNum * 0.01).toString(); // 1% of total prize pool
          isEligible = true;
        }
      }
      
      // Note: In a real implementation, you'd need to:
      // 1. Get all paid player scores from the contract
      // 2. Rank them properly
      // 3. Calculate exact winnings based on actual ranking
      // 4. Check if this specific player is in the winners list

      setWinnings({
        hasWinnings: isEligible && winningAmount !== '0' && !hasClaimed,
        winningAmount,
        hasClaimed: hasClaimed, // Use contract value instead of localStorage
        isEligible: isEligible, // Use the isEligible value determined by prize distribution logic (lines 154-169)
        rank,
        totalPrizePool,
        sessionActive: sessionActive && !gameFinalized, // Session is active only if not finalized
        isPaidPlayer: true, // Confirmed paid player
      });

    } catch (err) {
      console.error('Error calculating winnings:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate winnings');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, sessionInfo, playerRanking, hasClaimedFromContract, calculatedPrize]);

  // Recalculate winnings when dependencies change
  useEffect(() => {
    calculateWinnings();
  }, [calculateWinnings]);

  // Mark as claimed - contract will update this automatically
  const markAsClaimed = useCallback(() => {
    // Refresh winnings to get updated claim status from contract
    setWinnings(prev => ({
      ...prev,
      hasClaimed: true,
    }));
  }, []);

  // Refresh winnings data
  const refreshWinnings = useCallback(() => {
    calculateWinnings();
  }, [calculateWinnings]);

  return {
    winnings,
    isLoading: isLoading || sessionLoading || scoreLoading,
    error,
    markAsClaimed,
    refreshWinnings,
  };
}
