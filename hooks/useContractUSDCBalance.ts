'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';

// Contract addresses (Base Mainnet)
const TRIVIA_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xfF52Ed1DEb46C197aD7fce9DEC93ff9e987f8dB6';
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

  // Initialize Base Account SDK client-side only
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sdk = createBaseAccountSDK({
          appName: 'BEAT ME',
          appLogoUrl: 'https://base.org/logo.png',
          appChainIds: [base.id],
          subAccounts: {
            creation: 'on-connect',
            defaultAccount: 'sub',
          },
          paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
        });
        setProvider(sdk.getProvider());
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
      }
    }
  }, []);

  // Fetch contract data using Base Account SDK
  const fetchContractData = useCallback(async () => {
    if (!provider) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Read USDC balance of the TriviaBattle contract
      const balanceWei = await provider.request({
        method: 'eth_call',
        params: [{
          to: USDC_CONTRACT_ADDRESS,
          data: `0x70a08231${TRIVIA_CONTRACT_ADDRESS.slice(2).padStart(64, '0')}`, // balanceOf(address)
        }, 'latest']
      });

      // Read USDC decimals
      const decimals = await provider.request({
        method: 'eth_call',
        params: [{
          to: USDC_CONTRACT_ADDRESS,
          data: '0x313ce567', // decimals()
        }, 'latest']
      });

      // Read USDC symbol
      const symbol = await provider.request({
        method: 'eth_call',
        params: [{
          to: USDC_CONTRACT_ADDRESS,
          data: '0x95d89b41', // symbol()
        }, 'latest']
      });

      // Parse the results
      const balanceWeiBigInt = BigInt(balanceWei as string);
      const decimalsNum = parseInt(decimals as string, 16);
      const symbolStr = decodeString(symbol as string);

      const balance = Number(balanceWeiBigInt) / (10 ** decimalsNum);
      
      setState(prev => ({
        ...prev,
        balance,
        balanceWei: balanceWeiBigInt,
        decimals: decimalsNum,
        symbol: symbolStr,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error fetching contract data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contract data',
      }));
    }
  }, [provider]);

  // Helper function to decode hex string to string
  const decodeString = (hex: string): string => {
    try {
      // Remove 0x prefix and convert hex to string
      const hexString = hex.slice(2);
      const bytes = [];
      for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
      }
      // Find the length (first 32 bytes) and extract the string
      const length = parseInt(hexString.slice(64, 128), 16);
      const stringBytes = bytes.slice(32, 32 + length);
      return String.fromCharCode(...stringBytes);
    } catch {
      return 'USDC'; // fallback
    }
  };

  // Initial fetch and periodic refetch
  useEffect(() => {
    if (provider) {
      fetchContractData();
      
      // Set up periodic refetch every 10 seconds
      const interval = setInterval(fetchContractData, 10000);
      
      return () => clearInterval(interval);
    }
  }, [fetchContractData, provider]);

  useEffect(() => {
    if (state.error) {
      console.error('Contract USDC Balance Error:', state.error);
    }
  }, [state.error]);

  const refreshBalance = useCallback(() => {
    fetchContractData();
  }, [fetchContractData]);

  return {
    ...state,
    refreshBalance,
  };
}
