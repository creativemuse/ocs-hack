'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBaseAccount } from './useBaseAccount';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

/** Minimum ETH needed to cover gas when paymaster sponsorship is unavailable (~$0.05 buffer). */
const MIN_ETH_FOR_GAS = 0.00005;

const initialState = {
  balance: 0,
  balanceWei: BigInt(0),
  isLoading: false,
  error: null as string | null,
  hasEnoughForGas: false,
  minRequired: MIN_ETH_FOR_GAS,
};

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
});

export interface ETHBalanceState {
  balance: number;
  balanceWei: bigint;
  isLoading: boolean;
  error: string | null;
  hasEnoughForGas: boolean;
  minRequired: number;
}

export function useETHBalance() {
  const { address, subAccountAddress, isConnected } = useBaseAccount();
  const checkAddress = subAccountAddress || address;

  const [state, setState] = useState<ETHBalanceState>(initialState);

  const hasFetchedOnce = useRef(false);
  const checkAddressRef = useRef(checkAddress);
  checkAddressRef.current = checkAddress;

  const fetchETHBalance = useCallback(async () => {
    if (!checkAddress || !isConnected) {
      setState((prev) => ({
        ...prev,
        balance: 0,
        balanceWei: BigInt(0),
        hasEnoughForGas: false,
        isLoading: false,
        error: null,
      }));
      return;
    }

    if (!hasFetchedOnce.current) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const balanceWei = await publicClient.getBalance({
        address: checkAddress as `0x${string}`,
      });

      if (checkAddress !== checkAddressRef.current) return;

      const balance = Number(formatEther(balanceWei));
      const hasEnough = balance >= MIN_ETH_FOR_GAS;

      hasFetchedOnce.current = true;

      setState((prev) => ({
        ...prev,
        balance,
        balanceWei,
        hasEnoughForGas: hasEnough,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      if (checkAddress !== checkAddressRef.current) return;

      console.error('Error fetching ETH balance:', error);
      hasFetchedOnce.current = true;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          prev.balance > 0
            ? null
            : error instanceof Error
              ? error.message
              : 'Failed to fetch ETH balance',
      }));
    }
  }, [checkAddress, isConnected]);

  useEffect(() => {
    if (!isConnected || !checkAddress) {
      setState(initialState);
      hasFetchedOnce.current = false;
      return;
    }

    fetchETHBalance();
    const interval = setInterval(fetchETHBalance, 30_000);
    return () => clearInterval(interval);
  }, [fetchETHBalance, isConnected, checkAddress]);

  const refreshBalance = useCallback(() => {
    fetchETHBalance();
  }, [fetchETHBalance]);

  return {
    ...state,
    refreshBalance,
    isConnected,
    address: checkAddress,
  };
}
