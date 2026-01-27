import { useCallback, useMemo, useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from 'wagmi';
import { createPaidGameCalls } from '@/lib/transaction/paidGameCalls';
import { useAccountCapabilities } from './useAccountCapabilities';
import { usePaidGameEntryWithERC20Gas } from './usePaidGameEntryWithERC20Gas';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS, USDC_ABI, USDC_CONTRACT_ADDRESS, ENTRY_FEE_USDC } from '@/lib/blockchain/contracts';
import { parseUnits, decodeErrorResult } from 'viem';

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
  const { address } = useAccount();

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
      // Pre-flight checks
      if (!publicClient || !address) {
        throw new Error('Wallet not connected or public client unavailable');
      }

      // 1. Check USDC Balance BEFORE any transactions
      // This saves gas by preventing Approval if the user can't afford the Entry Fee
      try {
        const entryFeeWei = parseUnits(ENTRY_FEE_USDC, 6);
        const balance = await publicClient.readContract({
          address: USDC_CONTRACT_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });
        console.log('💰 USDC Balance:', balance.toString(), 'Required:', entryFeeWei.toString());

        if (balance < entryFeeWei) {
          throw new Error(`Insufficient USDC balance. You have ${Number(balance) / 1_000_000} USDC, but need ${ENTRY_FEE_USDC} USDC.`);
        }
        console.log('✅ Balance verified as sufficient');
      } catch (error) {
        // Re-throw if it's our insufficient balance error, otherwise log and continue (risky but consistent with other checks)
        // Actually, for balance, we should probably fail hard if we can't read it? 
        // But allow read errors to not block if it's just a temporary RPC issue? 
        // No, if we can't read balance, we probably can't transact.
        if (error instanceof Error && error.message.includes('Insufficient USDC balance')) {
          throw error;
        }
        console.warn('⚠️ Could not verify balance (RPC error?), proceeding anyway:', error);
      }

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

      // Verify allowance is sufficient before joining
      if (publicClient && address) {
        try {
          const entryFeeWei = parseUnits(ENTRY_FEE_USDC, 6);
          const allowance = await publicClient.readContract({
            address: USDC_CONTRACT_ADDRESS as `0x${string}`,
            abi: USDC_ABI,
            functionName: 'allowance',
            args: [address as `0x${string}`, TRIVIA_CONTRACT_ADDRESS as `0x${string}`],
          });
          console.log('📊 USDC Allowance:', allowance.toString(), 'Required:', entryFeeWei.toString());
          if (allowance < entryFeeWei) {
            throw new Error(`Insufficient allowance. Got ${allowance.toString()}, need ${entryFeeWei.toString()}`);
          }
          console.log('✅ Allowance verified as sufficient');
        } catch (error) {
          console.error('❌ Allowance check failed:', error);
          throw error;
        }
      }



      // Check if player has already participated (optional check, contract will revert if not)
      if (publicClient && address) {
        try {
          const hasParticipated = await publicClient.readContract({
            address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
            abi: TRIVIA_ABI,
            functionName: 'hasParticipated',
            args: [address as `0x${string}`],
          });
          console.log('👤 Has participated status:', hasParticipated);

          if (hasParticipated) {
            // CRITICAL FIX: Explicitly check if they are in the current session
            // "hasParticipated" might be true from a previous session if it wasn't cleared 
            // (though the contract should handle this, checking locally prevents simulation failures)
            try {
              const currentPlayers = await publicClient.readContract({
                address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
                abi: TRIVIA_ABI,
                functionName: 'getCurrentPlayers',
              }) as string[];

              const isAlreadyInSession = currentPlayers.some(
                (player) => player.toLowerCase() === address.toLowerCase()
              );

              if (isAlreadyInSession) {
                throw new Error('You have already joined this game session. Please wait for the next session.');
              } else {
                console.log('ℹ️ User has participated flag but is NOT in current players list. Proceeding.');
              }
            } catch (playerCheckError) {
              // If we can't check players, or if the user IS found (we threw above), rethrow
              if (playerCheckError instanceof Error && playerCheckError.message.includes('already joined')) {
                throw playerCheckError;
              }
              console.warn('⚠️ Could not verify current players list:', playerCheckError);
            }
          }
        } catch (error) {
          // If it's our "already joined" error, rethrow it
          if (error instanceof Error && error.message.includes('already joined')) {
            throw error;
          }
          // If we can't read the contract, log but continue (contract will validate)
          console.warn('⚠️ Could not verify participation status:', error);
        }
      }

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
      console.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Try to decode the specific revert reason
      let enhancedError = error;

      // Check for error data in various possible locations
      let errorData: `0x${string}` | undefined;
      if (error && typeof error === 'object') {
        // Viem/wagmi errors might have data in different places
        if ('data' in error && typeof error.data === 'string' && error.data.startsWith('0x')) {
          errorData = error.data as `0x${string}`;
        } else if ('cause' in error && error.cause && typeof error.cause === 'object' && 'data' in error.cause) {
          errorData = error.cause.data as `0x${string}`;
        } else if ('shortMessage' in error && typeof (error as any).shortMessage === 'string') {
          // Sometimes the error message contains the data
          const match = ((error as any).shortMessage as string).match(/0x[a-fA-F0-9]+/);
          if (match) {
            errorData = match[0] as `0x${string}`;
          }
        }
      }

      if (errorData) {
        try {
          const decoded = decodeErrorResult({
            abi: TRIVIA_ABI,
            data: errorData,
          });
          console.error('📋 Decoded error:', decoded);

          // Create a more helpful error message based on the decoded error
          if (decoded.errorName === 'TriviaBattle__SessionNotActive') {
            enhancedError = new Error('Session is not active. Please wait for a new session to start.');
          } else if (decoded.errorName === 'TriviaBattle__AlreadyParticipated') {
            enhancedError = new Error('You have already joined this game session. Please wait for the next session.');
          } else if (decoded.errorName === 'TriviaBattle__InsufficientEntryFee') {
            enhancedError = new Error('Insufficient USDC balance. Please ensure you have at least 1 USDC.');
          } else if (decoded.errorName === 'SafeERC20FailedOperation') {
            enhancedError = new Error('USDC transfer failed. Please check your allowance and balance.');
          } else {
            enhancedError = new Error(`Contract error: ${decoded.errorName || 'Unknown error'}`);
          }
        } catch (decodeError) {
          // If decoding fails, use the original error
          console.warn('⚠️ Could not decode error:', decodeError);
          console.warn('⚠️ Error data was:', errorData);
        }
      } else {
        // If no error data found, check the error message for clues
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('AlreadyParticipated') || errorMessage.includes('already participated')) {
          enhancedError = new Error('You have already joined this game session. Please wait for the next session.');
        } else if (errorMessage.includes('SessionNotActive') || errorMessage.includes('session not active')) {
          enhancedError = new Error('Session is not active. Please wait for a new session to start.');
        } else if (errorMessage.includes('InsufficientEntryFee') || errorMessage.includes('insufficient')) {
          enhancedError = new Error('Insufficient USDC balance or allowance. Please check your balance and try again.');
        }
      }

      // Re-throw to be handled by caller
      throw enhancedError;
    }
  }, [writeContractEOA, publicClient, address]);

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
