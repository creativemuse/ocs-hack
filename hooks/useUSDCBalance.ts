'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

// USDC contract address on Base Mainnet
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// USDC ABI for balance checking
const USDC_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export interface USDCBalanceState {
  balance: number;
  balanceWei: bigint;
  isLoading: boolean;
  error: string | null;
  hasEnoughForEntry: boolean;
  entryFeeRequired: number;
}

const ENTRY_FEE_USDC = 1; // 1 USDC entry fee

export function useUSDCBalance() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<USDCBalanceState>({
    balance: 0,
    balanceWei: BigInt(0),
    isLoading: false,
    error: null,
    hasEnoughForEntry: false,
    entryFeeRequired: ENTRY_FEE_USDC,
  });

  // Read USDC balance
  const { data: balanceWei, isLoading: balanceLoading, error: balanceError } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Read USDC decimals
  const { data: decimals } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Update state when balance changes
  useEffect(() => {
    if (balanceWei !== undefined && decimals !== undefined) {
      const balance = parseFloat(formatUnits(balanceWei, decimals));
      const hasEnough = balance >= ENTRY_FEE_USDC;
      
      setState(prev => ({
        ...prev,
        balance,
        balanceWei,
        hasEnoughForEntry: hasEnough,
        isLoading: balanceLoading,
        error: balanceError?.message || null,
      }));
    } else if (!address || !isConnected) {
      setState(prev => ({
        ...prev,
        balance: 0,
        balanceWei: BigInt(0),
        hasEnoughForEntry: false,
        isLoading: false,
        error: null,
      }));
    }
  }, [balanceWei, decimals, balanceLoading, balanceError, address, isConnected]);

  const refreshBalance = useCallback(() => {
    // The useReadContract hook will automatically refetch when this is called
    // due to the refetchInterval, but we can trigger an immediate refetch if needed
    setState(prev => ({ ...prev, isLoading: true }));
  }, []);

  return {
    ...state,
    refreshBalance,
    isConnected,
    address,
  };
}
