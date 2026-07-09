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
  sessionCounter: number;
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

// Wrapper that returns a fallback value instead of throwing — prevents one
// reverted call from killing the entire Promise.all batch.
async function rpcCallSafe(method: string, params: unknown[], fallback = '0x'): Promise<string> {
  try {
    return await rpcCall(method, params);
  } catch {
    return fallback;
  }
}

// Function selectors (keccak256 of signature, first 4 bytes)
const SELECTORS = {
  balanceOf: '0x70a08231',          // balanceOf(address)
  decimals: '0x313ce567',           // decimals()
  symbol: '0x95d89b41',             // symbol()
  entryFee: '0x072ea61c',           // entryFee()
  lastSessionTime: '0xcf0902af',    // lastSessionTime()
  sessionInterval: '0x36dc7bc0',    // sessionInterval()
  getCurrentPlayers: '0x02cac05c',  // getCurrentPlayers()
  isSessionActive: '0x031a65f4',    // isSessionActive()
  sessionCounter: '0xcc64e2af',      // sessionCounter()
  getSessionInfo: '0x9e10acf0',     // getSessionInfo(uint256)
} as const;

// Decode getSessionInfo() return: (bool isActive, bool distributed, uint256 startTime, uint256 endTime, uint256 prizePool, uint256 playerCount)
function decodeSessionInfo(hex: string): {
  isActive: boolean;
  distributed: boolean;
  startTime: number;
  endTime: number;
  prizePool: bigint;
  playerCount: number;
} {
  if (!hex || hex === '0x') {
    return { isActive: false, distributed: false, startTime: 0, endTime: 0, prizePool: BigInt(0), playerCount: 0 };
  }
  const data = hex.slice(2);
  if (data.length < 384) {
    return { isActive: false, distributed: false, startTime: 0, endTime: 0, prizePool: BigInt(0), playerCount: 0 };
  }
  const isActive = BigInt('0x' + data.slice(0, 64)) !== BigInt(0);
  const distributed = BigInt('0x' + data.slice(64, 128)) !== BigInt(0);
  const startTime = Number(BigInt('0x' + data.slice(128, 192)));
  const endTime = Number(BigInt('0x' + data.slice(192, 256)));
  const prizePool = BigInt('0x' + data.slice(256, 320));
  const playerCount = Number(BigInt('0x' + data.slice(320, 384)));
  return { isActive, distributed, startTime, endTime, prizePool, playerCount };
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
    sessionCounter: 0,
  });

  const hasFetchedOnce = useRef(false);

  const fetchContractData = useCallback(async () => {
    // Only show loading spinner on the very first fetch
    if (!hasFetchedOnce.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // Phase 1: Fetch sessionCounter first — we need it to call getSessionInfo().
      // In parallel, fetch everything that doesn't depend on sessionCounter.
      const [balanceWei, decimals, symbol, entryFeeRaw, lastSessionTimeRaw, sessionIntervalRaw, currentPlayersRaw, isSessionActiveRaw, sessionCounterRaw] = await Promise.all([
        // USDC contract reads (standard ERC-20 — always present)
        rpcCall('eth_call', [{ to: USDC_CONTRACT_ADDRESS, data: `${SELECTORS.balanceOf}${TRIVIA_CONTRACT_ADDRESS.slice(2).padStart(64, '0')}` }, 'latest']),
        rpcCall('eth_call', [{ to: USDC_CONTRACT_ADDRESS, data: SELECTORS.decimals }, 'latest']),
        rpcCall('eth_call', [{ to: USDC_CONTRACT_ADDRESS, data: SELECTORS.symbol }, 'latest']),
        // Trivia contract reads (use rpcCallSafe — deployed version may vary)
        rpcCallSafe('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: SELECTORS.entryFee }, 'latest']),
        rpcCallSafe('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: SELECTORS.lastSessionTime }, 'latest']),
        rpcCallSafe('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: SELECTORS.sessionInterval }, 'latest']),
        rpcCallSafe('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: SELECTORS.getCurrentPlayers }, 'latest']),
        rpcCallSafe('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: SELECTORS.isSessionActive }, 'latest']),
        rpcCallSafe('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: SELECTORS.sessionCounter }, 'latest']),
      ]);

      const balanceWeiBigInt = (balanceWei && balanceWei !== '0x') ? BigInt(balanceWei) : BigInt(0);
      const decimalsNum = parseInt(decimals, 16) || 6; // fallback to 6 (USDC) if parse fails
      const symbolStr = decodeString(symbol);
      const balance = Number(balanceWeiBigInt) / (10 ** decimalsNum);
      const entryFee = (entryFeeRaw && entryFeeRaw !== '0x') ? Number(BigInt(entryFeeRaw)) / (10 ** decimalsNum) : 0;
      const lastSessionTime = (lastSessionTimeRaw && lastSessionTimeRaw !== '0x') ? Number(BigInt(lastSessionTimeRaw)) : 0;
      const sessionInterval = (sessionIntervalRaw && sessionIntervalRaw !== '0x') ? Number(BigInt(sessionIntervalRaw)) : 0;
      const isSessionActive = (isSessionActiveRaw && isSessionActiveRaw !== '0x') ? BigInt(isSessionActiveRaw) !== BigInt(0) : false;
      const sessionCounter = (sessionCounterRaw && sessionCounterRaw !== '0x') ? Number(BigInt(sessionCounterRaw)) : 0;

      // Phase 2: Fetch getSessionInfo(sessionCounter) to read the per-session prize pool.
      // This replaces the old currentSessionPrizePool() call that doesn't exist on v5.
      const sessionInfoArg = sessionCounter.toString(16).padStart(64, '0');
      const sessionInfoRaw = await rpcCallSafe('eth_call', [{ to: TRIVIA_CONTRACT_ADDRESS, data: `${SELECTORS.getSessionInfo}${sessionInfoArg}` }, 'latest']);
      const sessionInfo = decodeSessionInfo(sessionInfoRaw);
      const sessionPrizePoolWei = sessionInfo.prizePool;
      const sessionPrizePool = Number(sessionPrizePoolWei) / (10 ** decimalsNum);

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
        sessionCounter,
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