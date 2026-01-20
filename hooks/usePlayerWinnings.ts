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

  // Read session status and prize pool
  const { data: isSessionActive, isLoading: sessionLoading } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'isSessionActive',
  });

  const { data: currentSessionPrizePool } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'currentSessionPrizePool',
  });

  // Read all players in current session
  const { data: currentPlayers } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getCurrentPlayers',
  });

  // Read player's score
  const { data: playerScore, isLoading: scoreLoading } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getPlayerScore',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Calculate winnings based on score and prize pool
  // Note: TriviaBattle.sol auto-distributes prizes, so this is for display purposes only
  const calculateWinnings = useCallback(async () => {
    if (!address || !isConnected) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sessionActive = Boolean(isSessionActive ?? false);
      const totalPrizePool = currentSessionPrizePool?.toString() || '0';
      const playersList = (currentPlayers as `0x${string}`[] | undefined) || [];
      const score = playerScore || BigInt(0);
      
      // Check if player is in the current session
      const isPaidPlayer = playersList.includes(address as `0x${string}`);
      
      if (!isPaidPlayer || score === BigInt(0)) {
        setWinnings({
          hasWinnings: false,
          winningAmount: '0',
          hasClaimed: false, // Prizes are auto-distributed, so "claimed" means they were distributed
          isEligible: false,
          totalPrizePool,
          sessionActive,
          isPaidPlayer: false,
        });
        return;
      }

      // Calculate ranking by comparing scores with all players
      // We need to get all player scores to determine ranking
      // For now, we'll estimate based on the player's score
      // In a production app, you'd batch read all player scores
      const totalPlayers = playersList.length;
      const totalPrizePoolNum = Number(totalPrizePool);
      
      // Estimate ranking (this is approximate - in production, fetch all scores and sort)
      // For display purposes, we'll show estimated winnings based on typical distribution
      let winningAmount = '0';
      let rank: number | undefined;
      let isEligible = false;
      
      // Note: Actual prize distribution happens in _distributePrizes():
      // - Top 3 players get prizes (60% first, 30% second, 10% third)
      // - Prizes are automatically sent when distributePrizes() is called
      // - There's no claim function - prizes are sent directly to winners
      
      // For active sessions, we can only estimate
      // Prizes will be calculated and distributed when the session ends
      if (sessionActive && totalPlayers > 0 && totalPrizePoolNum > 0) {
        // Estimate: assume player might be in top 3 if they have a score
        // This is just for UI display - actual prizes are calculated on-chain
        isEligible = true; // Player is eligible if they're in the session
        // We can't determine exact ranking without all scores, so we'll show 0 for now
        rank = undefined;
        winningAmount = '0'; // Will be determined when prizes are distributed
      }

      setWinnings({
        hasWinnings: isEligible && !sessionActive, // Only show winnings after session ends and prizes distributed
        winningAmount,
        hasClaimed: false, // Prizes are auto-distributed, check wallet for USDC transfers
        isEligible,
        rank,
        totalPrizePool,
        sessionActive,
        isPaidPlayer: true,
      });

    } catch (err) {
      console.error('Error calculating winnings:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate winnings');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, isSessionActive, currentSessionPrizePool, currentPlayers, playerScore]);

  // Recalculate winnings when dependencies change
  useEffect(() => {
    calculateWinnings();
  }, [calculateWinnings]);

  // Mark as claimed - NOTE: Prizes are auto-distributed, so this is just for UI state
  const markAsClaimed = useCallback(() => {
    // Prizes are automatically sent to winners when distributePrizes() is called
    // Check wallet for USDC transfers instead
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
