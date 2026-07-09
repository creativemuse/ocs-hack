'use client';

import { useState, useEffect, useCallback } from 'react';
import { encodeFunctionData, decodeFunctionResult } from 'viem';
import { useBaseAccount } from './useBaseAccount';
import { useBaseAccountContext } from '@/components/providers/BaseAccountProvider';
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
  const { address, isConnected } = useBaseAccount();
  const { provider } = useBaseAccountContext();
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
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [playerScore, setPlayerScore] = useState<any>(null);

  // Fetch session info using Base Account SDK
  const fetchSessionInfo = useCallback(async () => {
    if (!provider) return;

    try {
      // First read sessionCounter
      const counterData = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'sessionCounter',
      });
      const counterResult = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data: counterData,
        }, 'latest'],
      });
      const [sessionCounter] = decodeFunctionResult({
        abi: TRIVIA_ABI,
        functionName: 'sessionCounter',
        data: counterResult as `0x${string}`,
      }) as unknown as readonly [bigint];

      // Then read getSessionInfo(sessionCounter)
      const sessionData = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'getSessionInfo',
        args: [sessionCounter],
      });
      const sessionResult = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data: sessionData,
        }, 'latest'],
      });
      const decoded = decodeFunctionResult({
        abi: TRIVIA_ABI,
        functionName: 'getSessionInfo',
        data: sessionResult as `0x${string}`,
      }) as readonly [boolean, boolean, bigint, bigint, bigint, bigint];
      setSessionInfo(decoded);
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
  }, [provider]);

  // Fetch player score using Base Account SDK
  const fetchPlayerScore = useCallback(async () => {
    if (!address || !isConnected || !provider) return;

    try {
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'getPlayerScore',
        args: [address as `0x${string}`],
      });
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }, 'latest'],
      });
      const decoded = decodeFunctionResult({
        abi: TRIVIA_ABI,
        functionName: 'getPlayerScore',
        data: result as `0x${string}`,
      }) as unknown as readonly [bigint];
      setPlayerScore(decoded[0] as unknown as bigint);
    } catch (error) {
      console.error('Error fetching player score:', error);
    }
  }, [address, isConnected, provider]);

  // Calculate winnings based on score and prize pool
  const calculateWinnings = useCallback(async () => {
    if (!address || !isConnected || !sessionInfo || !playerScore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // getSessionInfo returns: (isActive, distributed, startTime, endTime, prizePool, playerCount)
      const [isActive, distributed, startTime, endTime, prizePool, playerCount] =
        sessionInfo as readonly [boolean, boolean, bigint, bigint, bigint, bigint];

      const sessionActive = isActive;
      const totalPrizePool = prizePool.toString();

      // getPlayerScore returns a single uint256
      const score = playerScore as unknown as bigint;

      // Check if player has a non-zero score
      if (score === BigInt(0)) {
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

      const isPaidPlayer = score > BigInt(0);

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
      const playerScoreNum = Number(score);
      const totalPaidPlayers = Number(playerCount);
      const totalPrizePoolNum = Number(prizePool);

      // Prize distribution tiers for paid players
      let winningAmount = '0';
      let rank = 0;
      let isEligible = false;

      // For paid players, show potential winnings even if prizes haven't been distributed yet
      // This gives them a preview of what they might win
      if (playerScoreNum > 0 && totalPaidPlayers > 0 && totalPrizePoolNum > 0) {

        // Prize distribution tiers (customize these based on your game rules)
        if (playerScoreNum >= 90) { // Top tier - 1st place
          rank = 1;
          winningAmount = Math.floor(totalPrizePoolNum * 0.5).toString(); // 50% of total prize pool
          isEligible = true;
        } else if (playerScoreNum >= 80) { // Second tier - 2nd place
          rank = 2;
          winningAmount = Math.floor(totalPrizePoolNum * 0.3).toString(); // 30% of total prize pool
          isEligible = true;
        } else if (playerScoreNum >= 70) { // Third tier - 3rd place
          rank = 3;
          winningAmount = Math.floor(totalPrizePoolNum * 0.15).toString(); // 15% of total prize pool
          isEligible = true;
        } else if (playerScoreNum >= 60) { // Fourth tier - participation prize
          rank = 4;
          winningAmount = Math.floor(totalPrizePoolNum * 0.05).toString(); // 5% of total prize pool
          isEligible = true;
        }
      }

      setWinnings({
        hasWinnings: isEligible && winningAmount !== '0',
        winningAmount,
        hasClaimed: distributed,
        isEligible: isPaidPlayer,
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
  }, [address, isConnected, sessionInfo, playerScore]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    if (provider) {
      fetchSessionInfo();
      fetchPlayerScore();
    }
  }, [fetchSessionInfo, fetchPlayerScore, provider]);

  // Recalculate winnings when dependencies change
  useEffect(() => {
    calculateWinnings();
  }, [calculateWinnings]);

  // Check if player has already claimed (using localStorage for now)
  useEffect(() => {
    if (address && winnings.hasWinnings) {
      const claimedKey = `claimed_${address}_${sessionInfo?.[2]}`; // Using session start time as unique ID
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
      const claimedKey = `claimed_${address}_${sessionInfo[2]}`;
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
    isLoading,
    error,
    markAsClaimed,
    refreshWinnings,
  };
}