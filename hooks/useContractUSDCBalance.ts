'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

// Public Base RPC endpoint — no wallet connection required
const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

export interface ContractUSDCBalanceState {
  balance: number;
  balanceWei: bigint;
  isLoading: boolean;
  error: string | null;
  symbol: string;
  decimals: number;
  entryFee: number;
}

// Helper function to decode ABI-encoded string
function decodeString(hex: string): string {
  try {
    const hexString = hex.slice(2);
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substr(i, 2), 16));
    }
    const length = parseInt(hexString.slice(64, 128), 16);
    const stringBytes = bytes.slice(32, 32 + length);
    return String.fromCharCode(...stringBytes);
  } catch {
    return 'USDC';
  }
}

async function rpcCall(method: string, params: unknown[]): Promise<string> {
  const res = await fetch(BASE_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export function useContractUSDCBalance() {
  const [state, setState] = useState<ContractUSDCBalanceState>({
    balance: 0,
    balanceWei: BigInt(0),
    isLoading: true,
    error: null,
    symbol: 'USDC',
    decimals: 6,
    entryFee: 0,
  });

  const hasFetchedOnce = useRef(false);

  const fetchContractData = useCallback(async () => {
    // Only show loading spinner on the very first fetch
    if (!hasFetchedOnce.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const balanceWei = await rpcCall('eth_call', [{
        to: USDC_CONTRACT_ADDRESS,
        data: `0x70a08231${TRIVIA_CONTRACT_ADDRESS.slice(2).padStart(64, '0')}`,
      }, 'latest']);

      const decimals = await rpcCall('eth_call', [{
        to: USDC_CONTRACT_ADDRESS,
        data: '0x313ce567',
      }, 'latest']);

      const symbol = await rpcCall('eth_call', [{
        to: USDC_CONTRACT_ADDRESS,
        data: '0x95d89b41',
      }, 'latest']);

      // Read the on-chain entry fee from the Trivia contract (entryFee() selector: 0x072ea61c)
      const entryFeeRaw = await rpcCall('eth_call', [{
        to: TRIVIA_CONTRACT_ADDRESS,
        data: '0x072ea61c',
      }, 'latest']);

      const balanceWeiBigInt = BigInt(balanceWei);
      const decimalsNum = parseInt(decimals, 16);
      const symbolStr = decodeString(symbol);
      const balance = Number(balanceWeiBigInt) / (10 ** decimalsNum);
      const entryFee = Number(BigInt(entryFeeRaw)) / (10 ** decimalsNum);

      hasFetchedOnce.current = true;

      setState({
        balance,
        balanceWei: balanceWeiBigInt,
        decimals: decimalsNum,
        symbol: symbolStr,
        isLoading: false,
        error: null,
        entryFee,
      });
    } catch (error) {
      console.error('Error fetching contract data:', error);
      hasFetchedOnce.current = true;
      // Preserve last known balance on error — don't flash "Error" if we had a value
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: prev.balance > 0 ? null : (error instanceof Error ? error.message : 'Failed to fetch contract data'),
      }));
    }
  }, []);

  useEffect(() => {
    fetchContractData();
    // Poll every 30 seconds instead of 10 to reduce flicker and RPC load
    const interval = setInterval(fetchContractData, 30000);
    return () => clearInterval(interval);
  }, [fetchContractData]);

  const refreshBalance = useCallback(() => {
    fetchContractData();
  }, [fetchContractData]);

  return {
    ...state,
    refreshBalance,
  };
}
