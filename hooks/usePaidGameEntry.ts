import { useCallback, useMemo, useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPaidGameCalls } from '@/lib/transaction/paidGameCalls';
import { useAccountCapabilities } from './useAccountCapabilities';
import { usePaidGameEntryWithERC20Gas } from './usePaidGameEntryWithERC20Gas';

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
  
  // For EOA (Normal Account) - uses ETH for gas
  const { writeContractAsync: writeContractEOA, error: eoaError } = useWriteContract();
  
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
    
    // For EOA, we need to execute calls sequentially
    // First approve USDC
    setCurrentStep('approving_usdc');
    console.log('EOA: Approving USDC...');
    await writeContractEOA({
      address: calls[0].address,
      abi: calls[0].abi,
      functionName: calls[0].functionName as "approve",
      args: calls[0].args as [`0x${string}`, bigint],
    });
    
    // Wait a moment for approval to be processed
    // Note: Ideally we should wait for the approval receipt here, but sticking to existing pattern for now
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
  }, [writeContractEOA]);

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
    if (capabilities?.paymasterService?.supported && erc20GasReady) {
      console.log('Using Smart Account with ERC-20 gas payment (USDC for gas)');
      setCurrentStep('batching_transaction');
      await joinGameWithERC20Gas();
      setCurrentStep('complete');
    } else {
      console.log('Using EOA account (ETH for gas)');
      await joinGameEOA();
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
