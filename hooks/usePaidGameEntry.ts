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
  
  // For EOA (Normal Account) - uses ETH for gas
  const { writeContractAsync: writeContractEOA, data: eoaData, error: eoaError } = useWriteContract();
  const { data: eoaReceipt } = useWaitForTransactionReceipt({
    hash: eoaData,
    query: { enabled: !!eoaData }
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Then join battle
    setCurrentStep('joining_battle');
    console.log('EOA: Joining battle...');
    await writeContractEOA({
      address: calls[1].address,
      abi: calls[1].abi,
      functionName: calls[1].functionName as "joinBattle",
      args: calls[1].args as [],
    });
    
    setCurrentStep('complete');
  }, [writeContractEOA]);

  // Smart Account uses ERC-20 gas payment (handled by usePaidGameEntryWithERC20Gas)
  // No need for separate implementation - the hook handles everything

  const joinGameUniversal = useCallback(async () => {
    // Reset step at the start
    setCurrentStep('idle');
    
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

    // For EOA - check the transaction receipt (enterGame)
    if (eoaReceipt) {
      console.log('EOA transaction result:', eoaReceipt);
      return {
        success: eoaReceipt.status === 'success',
        transactionHash: eoaReceipt.transactionHash,
        error: eoaReceipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    }

    return { success: false };
  }, [capabilities, erc20GasResult, eoaReceipt]);

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
