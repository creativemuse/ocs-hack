'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBaseAccount } from './useBaseAccount';
import { useBaseAccountContext } from '@/components/providers/BaseAccountProvider';
import { USDC_ADDRESS_BASE } from '@/lib/base-account/config';

export interface USDCBalanceState {
  balance: number;
  balanceWei: bigint;
  isLoading: boolean;
  error: string | null;
  hasEnoughForEntry: boolean;
  entryFeeRequired: number;
}

const ENTRY_FEE_USDC = 1;

export const useUSDCBalance = () => {
  const { address, isConnected } = useBaseAccount();
  const { provider } = useBaseAccountContext();
  const [state, setState] = useState<USDCBalanceState>({
    balance: 0,
    balanceWei: BigInt(0),
    isLoading: false,
    error: null,
    hasEnoughForEntry: false,
    entryFeeRequired: ENTRY_FEE_USDC,
  });

  const hasFetchedOnce = useRef(false);

  const fetchUSDCBalance = useCallback(async () => {
    if (!address || !isConnected || !provider) {
      setState((prev) => ({
        ...prev,
        balance: 0,
        balanceWei: BigInt(0),
        hasEnoughForEntry: false,
        isLoading: false,
        error: null,
      }));
      return;
    }

    if (!hasFetchedOnce.current) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const balanceWei = (await provider.request({
        method: 'eth_call',
        params: [
          {
            to: USDC_ADDRESS_BASE,
            data: `0x70a08231${address.slice(2).padStart(64, '0')}`,
          },
          'latest',
        ],
      })) as string;

      const decimals = (await provider.request({
        method: 'eth_call',
        params: [
          {
            to: USDC_ADDRESS_BASE,
            data: '0x313ce567',
          },
          'latest',
        ],
      })) as string;

      const balanceWeiBigInt = BigInt(balanceWei);
      const decimalsNum = parseInt(decimals, 16);
      const balance = Number(balanceWeiBigInt) / 10 ** decimalsNum;
      const hasEnough = balance >= ENTRY_FEE_USDC;

      hasFetchedOnce.current = true;

      setState((prev) => ({
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
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          prev.balance > 0
            ? null
            : error instanceof Error
              ? error.message
              : 'Failed to fetch USDC balance',
      }));
    }
  }, [address, isConnected, provider]);

  useEffect(() => {
    if (!provider || !isConnected || !address) {
      return;
    }

    fetchUSDCBalance();
    const interval = setInterval(fetchUSDCBalance, 30000);
    return () => clearInterval(interval);
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
};
