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

  // Calculate winnings based on score and prize pool
  const calculateWinnings = useCallback(async () => {
    if (!address || !isConnected || !sessionInfo || !playerRanking) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [prizePool, platformFee, playerCount, startTime, endTime, isActive, isFinalized, rankingsSubmitted] = sessionInfo as readonly [bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean];
      
      // Check if session is active and prizes have been distributed
      const sessionActive = isActive;
      const totalPrizePool = prizePool.toString();
      
      // Get player's ranking (0 means not ranked)
      const ranking = playerRanking as bigint;
      
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
      
      // Prize distribution tiers for paid players
      let winningAmount = '0';
      let rank = playerRankingNum;
      let isEligible = false;
      
      // For paid players, show potential winnings even if prizes haven't been distributed yet
      // This gives them a preview of what they might win
      if (playerRankingNum > 0 && totalPlayers > 0 && totalPrizePoolNum > 0) {
        
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
        hasWinnings: isEligible && winningAmount !== '0',
        winningAmount,
        hasClaimed: false, // We'll track this in localStorage or a separate contract call
        isEligible: isPaidPlayer, // All paid players are eligible to see the interface
        rank,
        totalPrizePool,
        sessionActive,
        isPaidPlayer: true, // Confirmed paid player
      });

    } catch (err) {
      console.error('Error calculating winnings:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate winnings');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, sessionInfo, playerRanking]);

  // Recalculate winnings when dependencies change
  useEffect(() => {
    calculateWinnings();
  }, [calculateWinnings]);

  // Check if player has already claimed (using localStorage for now)
  useEffect(() => {
    if (address && winnings.hasWinnings) {
      const claimedKey = `claimed_${address}_${sessionInfo?.[0]}`; // Using session start time as unique ID
      const hasClaimed = localStorage.getItem(claimedKey) === 'true';
      
      setWinnings(prev => ({
        ...prev,
        hasClaimed,
      }));
    }
  }, [address, winnings.hasWinnings, sessionInfo]);

  // Mark as claimed in localStorage
  const markAsClaimed = useCallback(() => {
    if (address && sessionInfo) {
      const claimedKey = `claimed_${address}_${sessionInfo[0]}`;
      localStorage.setItem(claimedKey, 'true');
      
      setWinnings(prev => ({
        ...prev,
        hasClaimed: true,
      }));
    }
  }, [address, sessionInfo]);

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
