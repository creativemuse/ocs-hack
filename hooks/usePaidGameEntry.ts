import { useCallback, useMemo, useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { createPaidGameCalls } from '@/lib/transaction/paidGameCalls';
import { useAccountCapabilities } from './useAccountCapabilities';
import { usePaidGameEntryWithERC20Gas } from './usePaidGameEntryWithERC20Gas';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

interface GameEntryResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export type TransactionStep = 
  | 'idle'
  | 'approving_usdc'
  | 'joining_battle'
  | 'batching_transaction'
  | 'processing_paymaster'
  | 'complete';

export function usePaidGameEntry() {
  const [currentStep, setCurrentStep] = useState<TransactionStep>('idle');
  const [finalTxHash, setFinalTxHash] = useState<string | undefined>(undefined);
  const [approvalHash, setApprovalHash] = useState<string | undefined>(undefined);
  
  // For EOA (Normal Account) - uses ETH for gas
  const { writeContractAsync: writeContractEOA, error: eoaError } = useWriteContract();
  const publicClient = usePublicClient();
  
  // Watch for approval transaction receipt
  const { data: approvalReceipt } = useWaitForTransactionReceipt({
    hash: approvalHash as `0x${string}`,
    query: { enabled: !!approvalHash }
  });
  
  // Watch for the FINAL transaction receipt (Join Battle)
  const { data: finalReceipt } = useWaitForTransactionReceipt({
    hash: finalTxHash as `0x${string}`,
    query: { enabled: !!finalTxHash }
  });

  // For Smart Account with ERC-20 gas payment (USDC for gas)
  const capabilities = useAccountCapabilities();
  const {
    joinGameWithERC20Gas,
    result: erc20GasResult,
    error: erc20GasError,
    isLoading: erc20GasLoading,
    isReady: erc20GasReady,
  } = usePaidGameEntryWithERC20Gas();

  const joinGameEOA = useCallback(async () => {
    const calls = createPaidGameCalls();
    setFinalTxHash(undefined); // Reset previous hash
    setApprovalHash(undefined); // Reset approval hash
    
    try {
      // For EOA, we need to execute calls sequentially
      // First approve USDC
      setCurrentStep('approving_usdc');
      console.log('EOA: Approving USDC...');
      const approvalTxHash = await writeContractEOA({
        address: calls[0].address,
        abi: calls[0].abi,
        functionName: calls[0].functionName as "approve",
        args: calls[0].args as [`0x${string}`, bigint],
      });
      
      console.log('✅ EOA: Approval transaction hash:', approvalTxHash);
      setApprovalHash(approvalTxHash);
      
      // CRITICAL: Wait for approval transaction to be confirmed on-chain
      // This ensures the allowance is available before calling joinBattle
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      console.log('⏳ Waiting for approval transaction to be confirmed...');
      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approvalTxHash,
        timeout: 120_000, // 2 minute timeout
      });
      
      if (approvalReceipt.status !== 'success') {
        throw new Error('Approval transaction failed');
      }
      
      console.log('✅ EOA: Approval confirmed on-chain');
      
      // Verify session is active before joining (optional check, contract will revert if not)
      if (publicClient) {
        try {
          const isSessionActive = await publicClient.readContract({
            address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
            abi: TRIVIA_ABI,
            functionName: 'isSessionActive',
          });
          console.log('📋 Session active status:', isSessionActive);
          if (!isSessionActive) {
            throw new Error('Session is not active. Please wait for a new session to start.');
          }
        } catch (error) {
          // If we can't read the contract, log but continue (contract will validate)
          console.warn('⚠️ Could not verify session status:', error);
        }
      }
      
      // Then join battle
      setCurrentStep('joining_battle');
      console.log('EOA: Joining battle...');
      const hash = await writeContractEOA({
        address: calls[1].address,
        abi: calls[1].abi,
        functionName: calls[1].functionName as "joinBattle",
        args: calls[1].args as [],
      });
      
      console.log('✅ EOA: Transaction hash received:', hash);
      // Set the hash for the FINAL transaction we care about
      setFinalTxHash(hash);
      
      setCurrentStep('complete');
    } catch (error) {
      console.error('❌ EOA transaction error:', error);
      // Re-throw to be handled by caller
      throw error;
    }
  }, [writeContractEOA, publicClient]);

  // Smart Account uses ERC-20 gas payment (handled by usePaidGameEntryWithERC20Gas)
  // No need for separate implementation - the hook handles everything

  const joinGameUniversal = useCallback(async () => {
    // Reset step at the start
    setCurrentStep('idle');
    setFinalTxHash(undefined);
    
    // First, ensure a blockchain game exists
    console.log('Ensuring blockchain game exists...');
    try {
      const response = await fetch('/api/create-blockchain-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        // Get the error details from the response
        let errorMessage = 'Failed to create blockchain game';
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
          console.error('API error details:', errorData);
        } catch (e) {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Blockchain game status:', result);
    } catch (error) {
      console.error('Failed to ensure blockchain game exists:', error);
      // Include the original error message in the new error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create blockchain game session: ${errorMessage}`);
    }

    // Now proceed with the game entry
    try {
      if (capabilities?.paymasterService?.supported && erc20GasReady) {
        console.log('Using Smart Account with ERC-20 gas payment (USDC for gas)');
        setCurrentStep('batching_transaction');
        await joinGameWithERC20Gas();
        setCurrentStep('complete');
      } else {
        console.log('Using EOA account (ETH for gas)');
        await joinGameEOA();
      }
    } catch (error) {
      // Enhance error message for popup blocker issues
      if (error instanceof Error && error.message.includes('Popup window was blocked')) {
        throw new Error('Popup window was blocked. Please allow popups for this site. If using Base Account, click "Try again" when the popup permission prompt appears.');
      }
      // Re-throw other errors as-is
      throw error;
    }
  }, [capabilities, erc20GasReady, joinGameEOA, joinGameWithERC20Gas]);

  // Parse results for both account types
  const result = useMemo((): GameEntryResult => {
    // For Smart Account with ERC-20 gas payment
    // Only return ERC-20 result if a transaction was actually attempted
    // (indicated by presence of transactionHash or error)
    if (capabilities?.paymasterService?.supported && erc20GasResult) {
      // Check if a transaction was actually attempted
      if (erc20GasResult.transactionHash || erc20GasResult.error) {
        return erc20GasResult;
      }
    }

    // For EOA - use transaction hash immediately if available, or wait for receipt
    if (finalTxHash) {
      // If we have a receipt, use its status
      if (finalReceipt) {
        console.log('EOA transaction result (confirmed):', finalReceipt);
        return {
          success: finalReceipt.status === 'success',
          transactionHash: finalReceipt.transactionHash,
          error: finalReceipt.status === 'reverted' ? 'Transaction reverted' : undefined,
        };
      }
      // Otherwise, return success with the hash (transaction is pending)
      console.log('EOA transaction result (pending):', finalTxHash);
      return {
        success: true,
        transactionHash: finalTxHash,
      };
    }

    return { success: false };
  }, [capabilities, erc20GasResult, finalReceipt, finalTxHash]);

  // Handle errors
  const error = capabilities?.paymasterService?.supported ? erc20GasError : eoaError;

  // Reset step when transaction completes or fails
  useEffect(() => {
    if (result.success || result.error) {
      // Keep step as 'complete' on success, reset on error after a delay
      if (result.error) {
        const timer = setTimeout(() => setCurrentStep('idle'), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [result]);

  return {
    joinGameUniversal,
    result,
    error,
    isSmartAccount: !!capabilities?.paymasterService?.supported && erc20GasReady,
    isEOA: !capabilities?.paymasterService?.supported,
    isLoading: capabilities?.paymasterService?.supported ? erc20GasLoading : false,
    currentStep,
  };
}
