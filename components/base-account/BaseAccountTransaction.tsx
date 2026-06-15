'use client';

import { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useBaseAccountContext } from '@/components/providers/BaseAccountProvider';
import { getBaseAccountProvider } from '@/lib/base-account/sdk';
import {
  sendAtomicBatchCalls,
  sendSequentialTransactions,
  supportsAtomicBatch,
} from '@/lib/base-account/batchCalls';
import { base } from 'viem/chains';
import { createPublicClient, http, type Hex } from 'viem';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const basePublicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
});

export type BaseAccountTxStatusExtras = {
  /** Last tx hash (joinBattle op — from batch or sequential send). */
  lastTxHash?: string;
  /** True when approve + join were batched into one wallet confirmation. */
  usedBatch?: boolean;
};

export type BaseAccountTransactionHandle = {
  submit: () => void;
};

interface BaseAccountTransactionProps {
  calls: Array<{
    to: `0x${string}`;
    value: `0x${string}`;
    data: `0x${string}`;
  }>;
  onStatus?: (
    status: 'pending' | 'success' | 'error',
    message?: string,
    extras?: BaseAccountTxStatusExtras
  ) => void;
  children?: React.ReactNode;
  className?: string;
  /** When false, only status messages render; parent should call `ref.submit()` (e.g. one-click paid entry). */
  showSubmitButton?: boolean;
  /** Parent-provided address — avoids race where this component's own useBaseAccount hasn't resolved yet. */
  connectedAddress?: string | null;
}

const BaseAccountTransaction = forwardRef<BaseAccountTransactionHandle, BaseAccountTransactionProps>(
  function BaseAccountTransaction(
    { calls, onStatus, children, className = '', showSubmitButton = true, connectedAddress },
    ref
  ) {
  const { isConnected: hookConnected, address: hookAddress } = useBaseAccount();
  const { provider: contextProvider } = useBaseAccountContext();
  const address = connectedAddress || hookAddress;
  const isConnected = Boolean(address) || hookConnected;
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [usedBatch, setUsedBatch] = useState(false);
  const inFlightRef = useRef(false);

  const handleTransaction = useCallback(async () => {
    if (!isConnected || !address) {
      onStatus?.('error', 'Not connected to Base Account');
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setIsLoading(true);
    setStatus('pending');
    setUsedBatch(false);
    onStatus?.('pending', 'Transaction pending...');

    try {
      const provider = contextProvider ?? getBaseAccountProvider();

      if (calls.length === 0) {
        throw new Error('No transaction calls provided');
      }

      let lastTxHash: string | undefined;
      let batchPath = false;

      const canBatch =
        calls.length > 1 && (await supportsAtomicBatch(provider, address));

      if (canBatch) {
        batchPath = true;
        onStatus?.('pending', 'Confirm once in your wallet (approve + join)...');
        lastTxHash = await sendAtomicBatchCalls(provider, address, calls);
      } else {
        onStatus?.('pending', 'Confirm in your wallet (step 1 of 2)...');
        lastTxHash = await sendSequentialTransactions(
          provider,
          address,
          calls,
          (hash) =>
            basePublicClient.waitForTransactionReceipt({
              hash,
              timeout: 180_000,
            })
        );
      }

      setUsedBatch(batchPath);
      console.log('Transaction confirmed:', lastTxHash, { batch: batchPath });
      setStatus('success');
      setMessage(batchPath ? 'Payment confirmed!' : 'Transaction successful!');
      onStatus?.('success', 'Transaction successful!', { lastTxHash, usedBatch: batchPath });
    } catch (error: unknown) {
      const err = error as { message?: string; code?: number; name?: string };
      const safeError = {
        message: err?.message || 'Unknown error',
        code: err?.code,
        name: err?.name,
      };
      console.error('Transaction failed:', safeError);
      setStatus('error');

      let errorMessage = 'Transaction failed';
      if (err?.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (err?.code === 5740) {
        errorMessage = 'Transaction too large for wallet to process';
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setMessage(errorMessage);
      onStatus?.('error', errorMessage);
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [isConnected, address, calls, onStatus, contextProvider]);

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        void handleTransaction();
      },
    }),
    [handleTransaction]
  );

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const pendingMessage = usedBatch
    ? 'Confirm once in your wallet, then wait for on-chain confirmation…'
    : 'Confirm in your wallet, then wait for on-chain confirmation…';

  return (
    <div className={className}>
      {showSubmitButton ? (
        <Button asChild>
          <div
            onClick={!isConnected || isLoading ? undefined : handleTransaction}
            aria-disabled={!isConnected || isLoading}
            role="button"
            className={`w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${!isConnected || isLoading ? 'pointer-events-none opacity-50' : ''}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (!isConnected || isLoading) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTransaction();
              }
            }}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getStatusIcon()}
            {children}
          </div>
        </Button>
      ) : (
        <div
          className="flex min-h-[3rem] flex-col items-center justify-center gap-2 py-2 text-center"
          aria-live="polite"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" aria-hidden />
              <span className="text-sm text-zinc-300">{pendingMessage}</span>
            </>
          ) : null}
        </div>
      )}
      {message && (
        <div className={`mt-2 text-sm text-center ${
          status === 'success' ? 'text-green-400' :
          status === 'error' ? 'text-red-400' :
          'text-gray-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
});

export default BaseAccountTransaction;
