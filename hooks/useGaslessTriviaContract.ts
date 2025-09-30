'use client';

// TEMPORARILY DISABLED - TODO: Fix sendTransaction call signatures
/*

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
// import { useSendTransaction } from '@coinbase/onchainkit/transaction';
// Note: useSendTransaction doesn't exist in OnchainKit. Gasless transactions require Transaction component wrapper.
import { TRIVIA_ABI, USDC_ABI, ENTRY_FEE_USDC, TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

export interface GaslessContractState {
  isApproving: boolean;
  isJoining: boolean;
  isSubmitting: boolean;
  error: string | null;
  transactionHash: string | null;
  isSuccess: boolean;
}

export function useGaslessTriviaContract() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<GaslessContractState>({
    isApproving: false,
    isJoining: false,
    isSubmitting: false,
    error: null,
    transactionHash: null,
    isSuccess: false,
  });

  // Note: useSendTransaction doesn't exist in OnchainKit
  // Gasless transactions require Transaction component wrapper
  // For now, this hook is disabled
  const sendTransaction = () => {
    throw new Error('Gasless transactions require Transaction component wrapper');
  };
  const hash = null;
  const writeError = null;
  const isPending = false;

  // Approve USDC spending for the trivia contract (gasless)
  const approveUSDC = useCallback(async () => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isApproving: true, error: null }));

    try {
      const entryFeeWei = parseUnits(ENTRY_FEE_USDC.toString(), 6); // USDC has 6 decimals
      
      // Encode the approve function call
      const approveData = {
        contractAddress: USDC_CONTRACT_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [TRIVIA_CONTRACT_ADDRESS, entryFeeWei],
      };

      // TODO: Fix sendTransaction call signature
      // await sendTransaction({
      //   calls: [approveData],
      //   // Enable gasless transactions with paymaster
      //   gasless: true,
      //   // Optional: specify paymaster configuration
      //   paymasterConfig: {
      //     // Use Coinbase's default paymaster for Base
      //     type: 'coinbase',
      //   },
      // });
    } catch (error) {
      console.error('Error approving USDC:', error);
      setState(prev => ({
        ...prev,
        isApproving: false,
        error: error instanceof Error ? error.message : 'Failed to approve USDC',
      }));
    }
  }, [address, isConnected, sendTransaction]);

  // Join the trivia battle (paid players) - gasless
  const joinBattle = useCallback(async () => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isJoining: true, error: null }));

    try {
      const joinBattleData = {
        contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'joinBattle',
        args: [],
      };

      // TODO: Fix sendTransaction call signature
      // await sendTransaction({
      //   calls: [joinBattleData],
      //   // Enable gasless transactions with paymaster
      //   gasless: true,
      //   paymasterConfig: {
      //     type: 'coinbase',
      //   },
      // });
    } catch (error) {
      console.error('Error joining battle:', error);
      setState(prev => ({
        ...prev,
        isJoining: false,
        error: error instanceof Error ? error.message : 'Failed to join battle',
      }));
    }
  }, [address, isConnected, sendTransaction]);

  // Join trial battle (trial players) - gasless
  const joinTrialBattle = useCallback(async (sessionId: string) => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isJoining: true, error: null }));

    try {
      const joinTrialBattleData = {
        contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'joinTrialBattle',
        args: [sessionId],
      };

      // TODO: Fix sendTransaction call signature
      // await sendTransaction({
        calls: [joinTrialBattleData],
        gasless: true,
        paymasterConfig: {
          type: 'coinbase',
        },
      });
    } catch (error) {
      console.error('Error joining trial battle:', error);
      setState(prev => ({
        ...prev,
        isJoining: false,
        error: error instanceof Error ? error.message : 'Failed to join trial battle',
      }));
    }
  }, [address, isConnected, sendTransaction]);

  // Submit score - gasless
  const submitScore = useCallback(async (score: number) => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const submitScoreData = {
        contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'submitScore',
        args: [BigInt(score)],
      };

      // TODO: Fix sendTransaction call signature
      // await sendTransaction({
        calls: [submitScoreData],
        gasless: true,
        paymasterConfig: {
          type: 'coinbase',
        },
      });
    } catch (error) {
      console.error('Error submitting score:', error);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit score',
      }));
    }
  }, [address, isConnected, sendTransaction]);

  // Submit trial score - gasless
  const submitTrialScore = useCallback(async (sessionId: string, score: number) => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const submitTrialScoreData = {
        contractAddress: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'submitTrialScore',
        args: [sessionId, BigInt(score)],
      };

      // TODO: Fix sendTransaction call signature
      // await sendTransaction({
        calls: [submitTrialScoreData],
        gasless: true,
        paymasterConfig: {
          type: 'coinbase',
        },
      });
    } catch (error) {
      console.error('Error submitting trial score:', error);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit trial score',
      }));
    }
  }, [address, isConnected, sendTransaction]);

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

  // Update success state when transaction is confirmed
  const markSuccess = useCallback(() => {
    setState(prev => ({
      ...prev,
      isApproving: false,
      isJoining: false,
      isSubmitting: false,
      isSuccess: true,
      error: null,
    }));
  }, []);

  return {
    ...state,
    isPending,
    transactionHash: hash,
    approveUSDC,
    joinBattle,
    joinTrialBattle,
    submitScore,
    submitTrialScore,
    resetState,
    markSuccess,
  };
}

*/
