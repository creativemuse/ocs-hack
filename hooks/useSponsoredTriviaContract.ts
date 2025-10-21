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

  const createJoinTrialBattleCall = useCallback((sessionId: string) => {
    if (!address || !isConnected) {
      return null; // Return null instead of throwing error
    }

    return {
      contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'joinTrialBattle',
      args: [sessionId],
    };
  }, [address, isConnected]);

  const createSubmitScoreCall = useCallback((score: number) => {
    if (!address || !isConnected) {
      return null; // Return null instead of throwing error
    }

    return {
      contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'submitScore',
      args: [BigInt(score)],
    };
  }, [address, isConnected]);

  const createSubmitTrialScoreCall = useCallback((sessionId: string, score: number) => {
    if (!address || !isConnected) {
      return null; // Return null instead of throwing error
    }

    return {
      contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'submitTrialScore',
      args: [sessionId, BigInt(score)],
    };
  }, [address, isConnected]);

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
