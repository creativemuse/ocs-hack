'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBaseAccount } from './useBaseAccount';
import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';

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
  const { address, isConnected } = useBaseAccount();
  const [state, setState] = useState<USDCBalanceState>({
    balance: 0,
    balanceWei: BigInt(0),
    isLoading: false,
    error: null,
    hasEnoughForEntry: false,
    entryFeeRequired: ENTRY_FEE_USDC,
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

  const hasFetchedOnce = useRef(false);

  // Fetch USDC balance using Base Account SDK
  const fetchUSDCBalance = useCallback(async () => {
    if (!address || !isConnected || !provider) {
      setState(prev => ({
        ...prev,
        balance: 0,
        balanceWei: BigInt(0),
        hasEnoughForEntry: false,
        isLoading: false,
        error: null,
      }));
      return;
    }

    // Only show loading spinner on the very first fetch
    if (!hasFetchedOnce.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // Read USDC balance
      const balanceWei = await provider.request({
        method: 'eth_call',
        params: [{
          to: USDC_CONTRACT_ADDRESS,
          data: `0x70a08231${address.slice(2).padStart(64, '0')}`, // balanceOf(address)
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

      const balanceWeiBigInt = BigInt(balanceWei as string);
      const decimalsNum = parseInt(decimals as string, 16);
      const balance = Number(balanceWeiBigInt) / (10 ** decimalsNum);
      const hasEnough = balance >= ENTRY_FEE_USDC;
      
      hasFetchedOnce.current = true;

      setState(prev => ({
        ...prev,
        balance,
        balanceWei: balanceWeiBigInt,
        hasEnoughForEntry: hasEnough,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      hasFetchedOnce.current = true;
      // Preserve last known balance on error
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: prev.balance > 0 ? null : (error instanceof Error ? error.message : 'Failed to fetch USDC balance'),
      }));
    }
  }, [address, isConnected, provider]);

  // Update state when balance changes
  useEffect(() => {
    if (provider && isConnected && address) {
      fetchUSDCBalance();

      // Set up periodic refetch every 30 seconds
      const interval = setInterval(fetchUSDCBalance, 30000);

      return () => clearInterval(interval);
    }
  }, [fetchUSDCBalance, provider, isConnected, address]);

  const refreshBalance = useCallback(() => {
    fetchUSDCBalance();
  }, [fetchUSDCBalance]);

  return {
    ...state,
    refreshBalance,
    isConnected,
    address,
  };
}
