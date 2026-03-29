'use client';

import { useState, useCallback } from 'react';
import { useBaseAccount } from './useBaseAccount';
import { parseUnits } from 'viem';
import { TRIVIA_ABI, USDC_ABI, ENTRY_FEE_USDC, TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

export interface SponsoredContractState {
  isApproving: boolean;
  isJoining: boolean;
  isSubmitting: boolean;
  error: string | null;
  transactionHash: string | null;
  isSuccess: boolean;
}

export function useSponsoredTriviaContract() {
  const { address, isConnected } = useBaseAccount();
  const [state, setState] = useState<SponsoredContractState>({
    isApproving: false,
    isJoining: false,
    isSubmitting: false,
    error: null,
    transactionHash: null,
    isSuccess: false,
  });

  // Create transaction calls for different operations
  const createApproveUSDCCall = useCallback(() => {
    if (!address || !isConnected) {
      return null; // Return null instead of throwing error
    }

    const entryFeeWei = parseUnits(ENTRY_FEE_USDC.toString(), 6); // USDC has 6 decimals
    
    return {
      contractAddress: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [TRIVIA_CONTRACT_ADDRESS, entryFeeWei],
    };
  }, [address, isConnected]);

  const createJoinBattleCall = useCallback(() => {
    if (!address || !isConnected) {
      return null; // Return null instead of throwing error
    }

    return {
      contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'joinBattle',
      args: [],
    };
  }, [address, isConnected]);

  // NOTE: Trial battle functions do NOT exist in the deployed contract
  // Trial mode must be implemented off-chain (e.g., via SpacetimeDB)
  const createJoinTrialBattleCall = useCallback((sessionId: string) => {
    console.warn('joinTrialBattle not available in contract. Trial mode must be implemented off-chain.');
    return null;
  }, []);

  // NOTE: Individual score submission does NOT exist for regular players
  // Contract has submitScores(address[], uint256[]) for batch submission by owner/chainlink only
  const createSubmitScoreCall = useCallback((score: number) => {
    console.warn('submitScore not available for players. Scores are submitted in batch by owner/chainlink via submitScores().');
    return null;
  }, []);

  // NOTE: Trial score submission does NOT exist in the deployed contract
  // Trial mode must be implemented off-chain (e.g., via SpacetimeDB)
  const createSubmitTrialScoreCall = useCallback((sessionId: string, score: number) => {
    console.warn('submitTrialScore not available in contract. Trial mode must be implemented off-chain.');
    return null;
  }, []);

  // Transaction success handler
  const handleTransactionSuccess = useCallback((hash: string) => {
    console.log('Sponsored transaction sent successfully:', hash);
    setState(prev => ({ 
      ...prev, 
      transactionHash: hash,
      isSuccess: true,
      isApproving: false,
      isJoining: false,
      isSubmitting: false,
      error: null
    }));
  }, []);

  // Transaction error handler
  const handleTransactionError = useCallback((error: Error) => {
    console.error('Sponsored transaction failed:', error);
    setState(prev => ({
      ...prev,
      isApproving: false,
      isJoining: false,
      isSubmitting: false,
      error: error.message,
    }));
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    setState({
      isApproving: false,
      isJoining: false,
      isSubmitting: false,
      error: null,
      transactionHash: null,
      isSuccess: false,
    });
  }, []);

  return {
    ...state,
    createApproveUSDCCall,
    createJoinBattleCall,
    createJoinTrialBattleCall,
    createSubmitScoreCall,
    createSubmitTrialScoreCall,
    handleTransactionSuccess,
    handleTransactionError,
    resetState,
  };
}
