'use client';

import { useState, useEffect } from 'react';
import { parseUnits } from 'viem';
import { ENTRY_FEE_USDC } from '@/lib/blockchain/contracts';
import { readTriviaEntryFeeWeiRpc } from '@/lib/blockchain/readTriviaEntryFee';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
const FALLBACK_WEI = parseUnits(ENTRY_FEE_USDC, 6);

export function useTriviaEntryFeeWei() {
  const [entryFeeWei, setEntryFeeWei] = useState<bigint>(FALLBACK_WEI);

  useEffect(() => {
    let cancelled = false;
    readTriviaEntryFeeWeiRpc(RPC_URL)
      .then((wei) => {
        if (!cancelled) setEntryFeeWei(wei);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return entryFeeWei;
}
