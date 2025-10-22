import { useCallback, useEffect, useMemo } from 'react';
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

  const joinGameEOA = useCallback(async () => {
    const calls = createPaidGameCalls();
    
    // For EOA, we need to execute calls sequentially
    // First approve USDC
    await writeContractEOA({
      address: calls[0].address,
      abi: calls[0].abi,
      functionName: calls[0].functionName as "approve",
      args: calls[0].args as [`0x${string}`, bigint],
    });
    
    // Then join battle (this would need to be called after approval is confirmed)
    // For now, we'll handle this in the component
  }, [writeContractEOA]);

  const joinGameSmartAccount = useCallback(async () => {
    const calls = createPaidGameCalls();
    
    await writeContractSmartAccount({
      address: calls[0].address,
      abi: calls[0].abi,
      functionName: calls[0].functionName as "approve",
      args: calls[0].args as [`0x${string}`, bigint],
    });
  }, [writeContractSmartAccount, capabilities]);

  const joinGameUniversal = useCallback(async () => {
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
    // For EOA
    if (eoaReceipt) {
      return {
        success: eoaReceipt.status === 'success',
        transactionHash: eoaReceipt.transactionHash,
        error: eoaReceipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    }

    // For Smart Account
    if (saStatusData?.receipts?.[0]) {
      const receipt = saStatusData.receipts[0];
      return {
        success: receipt.status === 'success',
        transactionHash: receipt.transactionHash,
        error: receipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    }

    return { success: false };
  }, [eoaReceipt, saStatusData]);

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
