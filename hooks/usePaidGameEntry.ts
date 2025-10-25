import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useCallsStatus } from 'wagmi';
import { createPaidGameCalls } from '@/lib/transaction/paidGameCalls';
import { useAccountCapabilities } from './useAccountCapabilities';
import { TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

interface GameEntryResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export function usePaidGameEntry() {
  // For EOA (Normal Account)
  const { writeContractAsync: writeContractEOA, data: eoaData, error: eoaError } = useWriteContract();
  const { data: eoaReceipt } = useWaitForTransactionReceipt({
    hash: eoaData,
    query: { enabled: !!eoaData }
  });

  // For Smart Account with Paymaster
  const capabilities = useAccountCapabilities();
  const { writeContractAsync: writeContractSmartAccount, data: saData, error: saError } = useWriteContract();
  const { data: saStatusData } = useCallsStatus({
    id: saData ? (saData as `0x${string}`) : '',
    query: { enabled: !!saData }
  });

  // Track the second transaction (enterGame) for Smart Accounts
  const [secondTransactionHash, setSecondTransactionHash] = useState<`0x${string}` | undefined>(undefined);
  const { data: secondTransactionReceipt } = useWaitForTransactionReceipt({
    hash: secondTransactionHash,
    query: { enabled: !!secondTransactionHash }
  });

  const joinGameEOA = useCallback(async () => {
    const calls = createPaidGameCalls();
    
    // For EOA, we need to execute calls sequentially
    // First approve USDC
    console.log('EOA: Approving USDC...');
    await writeContractEOA({
      address: calls[0].address,
      abi: calls[0].abi,
      functionName: calls[0].functionName as "approve",
      args: calls[0].args as [`0x${string}`, bigint],
    });
    
    // Wait a moment for approval to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Then enter game
    console.log('EOA: Entering game...');
    await writeContractEOA({
      address: calls[1].address,
      abi: calls[1].abi,
      functionName: calls[1].functionName as "enterGame",
      args: calls[1].args as [],
    });
  }, [writeContractEOA]);

  const joinGameSmartAccount = useCallback(async () => {
    const calls = createPaidGameCalls();
    
    // For Smart Account, we can execute both calls in a batch
    console.log('Smart Account: Executing approve and enterGame...');
    await writeContractSmartAccount({
      address: calls[0].address,
      abi: calls[0].abi,
      functionName: calls[0].functionName as "approve",
      args: calls[0].args as [`0x${string}`, bigint],
    });
    
    // Wait a moment for approval to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Note: For Smart Accounts with paymaster, we need to handle the second call
    // This might need to be implemented differently depending on the Smart Account implementation
    // For now, we'll execute them sequentially like EOA
    console.log('Smart Account: Entering game...');
    const secondTxHash = await writeContractSmartAccount({
      address: calls[1].address,
      abi: calls[1].abi,
      functionName: calls[1].functionName as "enterGame",
      args: calls[1].args as [],
    });
    
    // Track the second transaction for success detection
    if (secondTxHash) {
      setSecondTransactionHash(secondTxHash);
    }
  }, [writeContractSmartAccount, capabilities]);

  const joinGameUniversal = useCallback(async () => {
    // First, ensure a blockchain game exists
    console.log('Ensuring blockchain game exists...');
    try {
      const response = await fetch('/api/create-blockchain-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create blockchain game');
      }
      
      const result = await response.json();
      console.log('Blockchain game status:', result);
    } catch (error) {
      console.error('Failed to ensure blockchain game exists:', error);
      throw new Error('Failed to create blockchain game session');
    }

    // Now proceed with the game entry
    if (capabilities?.paymasterService) {
      console.log('Using Smart Account with Paymaster');
      await joinGameSmartAccount();
    } else {
      console.log('Using EOA account');
      await joinGameEOA();
    }
  }, [capabilities, joinGameEOA, joinGameSmartAccount]);

  // Parse results for both account types
  const result = useMemo((): GameEntryResult => {
    // For EOA - check the second transaction (enterGame)
    if (eoaReceipt) {
      console.log('EOA transaction result:', eoaReceipt);
      return {
        success: eoaReceipt.status === 'success',
        transactionHash: eoaReceipt.transactionHash,
        error: eoaReceipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    }

    // For Smart Account - check the second transaction receipt (enterGame)
    if (secondTransactionReceipt) {
      console.log('Smart Account second transaction result:', secondTransactionReceipt);
      return {
        success: secondTransactionReceipt.status === 'success',
        transactionHash: secondTransactionReceipt.transactionHash,
        error: secondTransactionReceipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    }

    // Fallback: check if we have any receipts at all
    if (saStatusData?.receipts && saStatusData.receipts.length > 0) {
      const lastReceipt = saStatusData.receipts[saStatusData.receipts.length - 1];
      console.log('Smart Account last transaction result:', lastReceipt);
      return {
        success: lastReceipt.status === 'success',
        transactionHash: lastReceipt.transactionHash,
        error: lastReceipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    }

    return { success: false };
  }, [eoaReceipt, secondTransactionReceipt, saStatusData]);

  // Handle errors
  const error = eoaError || saError;

  useEffect(() => {
    if (saStatusData) {
      console.log('Smart Account transaction status:', saStatusData);
    }
  }, [saStatusData]);

  return {
    joinGameUniversal,
    result,
    error,
    isSmartAccount: !!capabilities?.paymasterService,
    isEOA: !capabilities?.paymasterService,
  };
}
