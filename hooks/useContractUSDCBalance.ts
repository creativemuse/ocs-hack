'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { decodeFunctionResult } from 'viem';
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
  sessionPrizePool: number;
  sessionPrizePoolWei: bigint;
  lastSessionTime: number;
  sessionInterval: number;
  playerCount: number;
  isSessionActive: boolean;
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
    sessionPrizePool: 0,
    sessionPrizePoolWei: BigInt(0),
    lastSessionTime: 0,
    sessionInterval: 0,
    playerCount: 0,
    isSessionActive: false,
  });

  const hasFetchedOnce = useRef(false);

  const fetchContractData = useCallback(async () => {
    // Only show loading spinner on the very first fetch
    if (!hasFetchedOnce.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // Batch all RPC calls in parallel for better latency
      const [balanceWei, decimals, symbol, entryFeeRaw, sessionPrizePoolRaw, lastSessionTimeRaw, sessionIntervalRaw, currentPlayersRaw, isSessionActiveRaw] = await Promise.all([
        // USDC contract reads
        rpcCall('eth_call', [{ to: USDC_CONTRACT_ADDRESS, data: `0x70a08231${TRIVIA_CONTRACT_ADDRESS.slice(2).padStart(64, '0')}` }, 'latest']),
        rpcCall('eth_call', [{ to: USDC_CONTRACT_ADDRESS, data: '0x313ce567' }, 'latest']),
        rpcCall('eth_call', [{ to: USDC_CONTRACT_ADDRESS, data: '0x95d89b41' }, 'latest']),
        // Trivia contract reads
        rpcCall('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: '0x072ea61c' }, 'latest']), // entryFee()
        rpcCall('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: '0x1a7dd42a' }, 'latest']), // currentSessionPrizePool()
        rpcCall('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: '0xcf0902af' }, 'latest']), // lastSessionTime()
        rpcCall('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: '0x36dc7bc0' }, 'latest']), // sessionInterval()
        rpcCall('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: '0x02cac05c' }, 'latest']), // getCurrentPlayers()
        rpcCall('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: '0x031a65f4' }, 'latest']), // isSessionActive()
      ]);

      const balanceWeiBigInt = BigInt(balanceWei);
      const decimalsNum = parseInt(decimals, 16);
      const symbolStr = decodeString(symbol);
      const balance = Number(balanceWeiBigInt) / (10 ** decimalsNum);
      const entryFee = Number(BigInt(entryFeeRaw)) / (10 ** decimalsNum);
      const sessionPrizePoolWei = (sessionPrizePoolRaw && sessionPrizePoolRaw !== '0x') ? BigInt(sessionPrizePoolRaw) : BigInt(0);
      const sessionPrizePool = Number(sessionPrizePoolWei) / (10 ** decimalsNum);
      const lastSessionTime = Number(BigInt(lastSessionTimeRaw));
      const sessionInterval = Number(BigInt(sessionIntervalRaw));
      const isSessionActive = BigInt(isSessionActiveRaw) !== BigInt(0);

      // Decode getCurrentPlayers() using viem for proper ABI handling
      let playerCount = 0;
      if (currentPlayersRaw && currentPlayersRaw !== '0x') {
        const players = decodeFunctionResult({
          abi: [{ inputs: [], name: 'getCurrentPlayers', outputs: [{ type: 'address[]' }], stateMutability: 'view', type: 'function' }],
          functionName: 'getCurrentPlayers',
          data: currentPlayersRaw as `0x${string}`,
        }) as `0x${string}`[];
        playerCount = players.length;
      }

      hasFetchedOnce.current = true;

      setState({
        balance,
        balanceWei: balanceWeiBigInt,
        decimals: decimalsNum,
        symbol: symbolStr,
        isLoading: false,
        error: null,
        entryFee,
        sessionPrizePool,
        sessionPrizePoolWei,
        lastSessionTime,
        sessionInterval,
        playerCount,
        isSessionActive,
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
