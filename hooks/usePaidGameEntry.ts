import { useCallback, useMemo, useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount, useWalletClient } from 'wagmi';
import { createPaidGameCalls } from '@/lib/transaction/paidGameCalls';
import { useAccountCapabilities } from './useAccountCapabilities';
import { usePaidGameEntryWithERC20Gas } from './usePaidGameEntryWithERC20Gas';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS, USDC_ABI, USDC_CONTRACT_ADDRESS, ENTRY_FEE_USDC } from '@/lib/blockchain/contracts';
import { parseUnits, decodeErrorResult, encodeFunctionData, toHex } from 'viem';
import { base } from 'wagmi/chains';

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
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  // Capabilities
  const capabilities = useAccountCapabilities();
  const supportsAtomicBatch = capabilities.atomicBatch?.supported;
  const supportsMagicSpend = capabilities.auxiliaryFunds?.supported;

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

  // For Smart Account fallback or specific ERC20 gas handling if we don't use batching
  // (We'll mostly supersede this with batching, but keep it as a potential fallback or for parts)
  const {
    isReady: erc20GasReady,
  } = usePaidGameEntryWithERC20Gas();




  const joinGameEOA = useCallback(async () => {
    const calls = createPaidGameCalls();
    setFinalTxHash(undefined);
    setApprovalHash(undefined);

    try {
      if (!publicClient || !address) {
        throw new Error('Wallet not connected or public client unavailable');
      }

      // 1. Check USDC Balance
      // Skip strict check if MagicSpend is supported
      if (!supportsMagicSpend) {
        try {
          const entryFeeWei = parseUnits(ENTRY_FEE_USDC, 6);
          const balance = await publicClient.readContract({
            address: USDC_CONTRACT_ADDRESS as `0x${string}`,
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          });

          if (balance < entryFeeWei) {
            throw new Error(`Insufficient USDC balance. Need ${ENTRY_FEE_USDC} USDC.`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('Insufficient USDC balance')) {
            throw error;
          }
          console.warn('⚠️ Could not verify balance, proceeding:', error);
        }
      } else {
        console.log('✨ MagicSpend detected, skipping strict balance check');
      }

      // Sequential Execution
      setCurrentStep('approving_usdc');
      console.log('EOA: Approving USDC...');
      const approvalTxHash = await writeContractEOA({
        address: calls[0].address,
        abi: calls[0].abi,
        functionName: calls[0].functionName as "approve",
        args: calls[0].args as [`0x${string}`, bigint],
      });

      setApprovalHash(approvalTxHash);

      console.log('⏳ Waiting for approval...');
      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approvalTxHash,
        timeout: 120_000,
      });

      if (approvalReceipt.status !== 'success') {
        throw new Error('Approval transaction failed');
      }

      setCurrentStep('joining_battle');
      console.log('EOA: Joining battle...');
      const hash = await writeContractEOA({
        address: calls[1].address,
        abi: calls[1].abi,
        functionName: calls[1].functionName as "joinBattle",
        args: calls[1].args as [],
      });

      setFinalTxHash(hash);
      setCurrentStep('complete');
    } catch (error) {
      console.error('❌ EOA transaction error:', error);
      throw error;
    }
  }, [writeContractEOA, publicClient, address, supportsMagicSpend]);

  const joinGameBatch = useCallback(async () => {
    setFinalTxHash(undefined);
    setCurrentStep('batching_transaction');

    try {
      if (!walletClient || !address || !publicClient) {
        throw new Error('Wallet client not ready');
      }

      // 2. Prepare Batch Calls
      const batchCalls: any[] = []; // Using any to match wallet_sendCalls format flexibly

      // Trivia Contract Approval
      const entryFeeWei = parseUnits(ENTRY_FEE_USDC, 6);
      batchCalls.push({
        to: USDC_CONTRACT_ADDRESS as `0x${string}`,
        value: toHex(BigInt(0)),
        data: encodeFunctionData({
          abi: USDC_ABI,
          functionName: 'approve',
          args: [TRIVIA_CONTRACT_ADDRESS as `0x${string}`, entryFeeWei],
        }),
      });

      // Join Battle
      batchCalls.push({
        to: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        value: toHex(BigInt(0)),
        data: encodeFunctionData({
          abi: TRIVIA_ABI,
          functionName: 'joinBattle',
          args: [],
        }),
      });

      console.log(`🚀 Sending ${batchCalls.length} batched calls on Base...`);

      // Send via wallet_sendCalls
      const id = await (walletClient as any).request({
        method: 'wallet_sendCalls',
        params: [{
          version: '1.0',
          chainId: `0x${base.id.toString(16)}`, // 8453 in hex
          from: address,
          calls: batchCalls,
          capabilities: capabilities // Pass discovered capabilities (paymaster etc)
        }]
      });

      console.log('✅ Batch submitted, Call ID:', id);

      // Poll for status
      let isPending = true;
      while (isPending) {
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s

        try {
          const statusFn = (walletClient as any).request; // specific typing workaround
          const status = await statusFn({
            method: 'wallet_getCallsStatus',
            params: [id]
          });

          console.log('Batch Status:', status);

          if (status.status === 'CONFIRMED' || status.status === 200) {
            isPending = false;
            // Extract the transaction hash if available from the receipts
            // Note: status.receipts might be array of receipts
            const txHash = status.receipts?.[0]?.transactionHash;
            if (txHash) setFinalTxHash(txHash);

            setCurrentStep('complete');
          } else if (status.status === 'REVERTED' || (typeof status.status === 'number' && status.status !== 100)) {
            throw new Error('Batch transaction reverted');
          }
        } catch (e) {
          console.warn('Polling status error (may be temporary):', e);
          // Don't throw immediately, retrying...
        }
      }

    } catch (error) {
      console.error('❌ Batch transaction failed:', error);
      throw error;
    }
  }, [walletClient, address, publicClient, capabilities]);


  const joinGameUniversal = useCallback(async () => {
    setCurrentStep('idle');
    setFinalTxHash(undefined); // Clear old state

    console.log('Ensuring blockchain game session...');
    try {
      // (Keep existing API check)
      const response = await fetch('/api/create-blockchain-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to create blockchain game');
    } catch (error) {
      console.error('Game creation check failed:', error);
      throw error;
    }

    try {
      if (supportsAtomicBatch) {
        console.log('⚡️ Using Atomic Batch (Base Account / Smart Wallet)');
        await joinGameBatch();
      } else {
        console.log('👤 Using EOA (Sequential)');
        await joinGameEOA();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Popup window was blocked')) {
        throw new Error('Popup window was blocked. Please allow popups.');
      }
      throw error;
    }

  }, [supportsAtomicBatch, joinGameBatch, joinGameEOA]);

  // Result parsing (simplified)
  const result = useMemo((): GameEntryResult => {
    if (finalTxHash) {
      return { success: true, transactionHash: finalTxHash };
    }
    return { success: false };
  }, [finalTxHash]);

  // Reset step on success/fail
  useEffect(() => {
    if (result.success || eoaError) {
      // If error, reset quickly. If success, maybe keep it 'complete' a bit?
      // Keeping existing logic
    }
  }, [result, eoaError]);


  return {
    joinGameUniversal,
    result,
    error: eoaError, // or batch error state if we add it
    isSmartAccount: !!supportsAtomicBatch,
    isEOA: !supportsAtomicBatch,
    isLoading: currentStep !== 'idle' && currentStep !== 'complete',
    currentStep,
  };
}
