'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';

// Contract addresses (Base Mainnet)
const TRIVIA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xc166a6FB38636e8430d6A2Efb7A601c226659425';
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
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

export interface ContractUSDCBalanceState {
  balance: number;
  balanceWei: bigint;
  isLoading: boolean;
  error: string | null;
  symbol: string;
  decimals: number;
}

export function useContractUSDCBalance() {
  const [state, setState] = useState<ContractUSDCBalanceState>({
    balance: 0,
    balanceWei: BigInt(0),
    isLoading: false,
    error: null,
    symbol: 'USDC',
    decimals: 6,
  });

  // Read USDC balance of the TriviaBattle contract
  const { 
    data: balanceWei, 
    isLoading: balanceLoading, 
    error: balanceError,
    refetch: refetchBalance 
  } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [TRIVIA_CONTRACT_ADDRESS as `0x${string}`],
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
      staleTime: 5000, // Consider data stale after 5 seconds
    },
  });

  // Read USDC decimals
  const { 
    data: decimals,
    error: decimalsError 
  } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'decimals',
    query: {
      refetchInterval: 60000, // Decimals don't change, refetch every minute
    },
  });

  // Read USDC symbol
  const { 
    data: symbol,
    error: symbolError 
  } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'symbol',
    query: {
      refetchInterval: 60000, // Symbol doesn't change, refetch every minute
    },
  });

  // Update state when data changes
  useEffect(() => {
    if (balanceWei !== undefined && decimals !== undefined && symbol !== undefined) {
      const balance = Number(balanceWei) / (10 ** decimals);
      
      setState(prev => ({
        ...prev,
        balance,
        balanceWei,
        decimals,
        symbol: symbol as string,
        isLoading: balanceLoading,
        error: balanceError?.message || decimalsError?.message || symbolError?.message || null,
      }));
    } else {
      setState(prev => ({
        ...prev,
        balance: 0,
        balanceWei: BigInt(0),
        isLoading: balanceLoading,
        error: balanceError?.message || decimalsError?.message || symbolError?.message || null,
      }));
    }
  }, [balanceWei, decimals, symbol, balanceLoading, balanceError, decimalsError, symbolError]);

  const refreshBalance = useCallback(() => {
    refetchBalance();
  }, [refetchBalance]);

  return {
    ...state,
    refreshBalance,
  };
}
