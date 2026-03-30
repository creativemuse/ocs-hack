'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBaseAccount } from './useBaseAccount';
import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';
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

  // Initialize Base Account SDK client-side only
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sdk = createBaseAccountSDK({
          appName: 'BEAT ME',
          appLogoUrl: 'https://base.org/logo.png',
          appChainIds: [base.id],
          subAccounts: {
            creation: 'on-connect',
            defaultAccount: 'sub',
          },
          paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
        });
        setProvider(sdk.getProvider());
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
      }
    }
  }, []);

  // Fetch session info using Base Account SDK
  const fetchSessionInfo = useCallback(async () => {
    if (!provider) return;
    
    try {
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data: '0x' + 'getSessionInfo()'.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''), // This is a simplified approach
        }, 'latest']
      });
      setSessionInfo(result);
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
  }, [provider]);

  // Fetch player score using Base Account SDK
  const fetchPlayerScore = useCallback(async () => {
    if (!address || !isConnected || !provider) return;
    
    try {
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data: `0x${'getPlayerScore(address)'.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')}${address.slice(2).padStart(64, '0')}`,
        }, 'latest']
      });
      setPlayerScore(result);
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
      const [startTime, endTime, prizePool, paidPlayerCount, trialPlayerCount, isActive, prizesDistributed] = sessionInfo as readonly [bigint, bigint, bigint, bigint, bigint, boolean, boolean];
      
      // Check if session is active and prizes have been distributed
      const sessionActive = isActive;
      const totalPrizePool = prizePool.toString();
      
      // Get player's score
      const [score, hasSubmitted, submissionTime] = playerScore as readonly [bigint, boolean, bigint];
      
      // Check if player is a paid player (has submitted a score in paid battle)
      // Trial players should never be able to claim winnings
      if (!hasSubmitted || score === BigInt(0)) {
        setWinnings({
          hasWinnings: false,
          winningAmount: '0',
          hasClaimed: false,
          isEligible: false,
          totalPrizePool,
          sessionActive,
          isPaidPlayer: false, // No score = not a paid player
        });
        return;
      }

      // If player has a score, they must be a paid player (trial scores are separate)
      const isPaidPlayer = hasSubmitted && score > BigInt(0);
      
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
      const playerScoreNum = Number(score);
      const totalPaidPlayers = Number(paidPlayerCount);
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
    isLoading,
    error,
    markAsClaimed,
    refreshWinnings,
  };
}
