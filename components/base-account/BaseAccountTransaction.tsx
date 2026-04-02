'use client';

import { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';
import { createPublicClient, http, numberToHex, type Hex } from 'viem';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const basePublicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
});

export type BaseAccountTxStatusExtras = {
  /** Last `eth_sendTransaction` hash (e.g. `joinBattle` after approve in a batch). */
  lastTxHash?: string;
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
  // Prefer parent-provided address to avoid race condition where hook hasn't resolved yet
  const address = connectedAddress || hookAddress;
  const isConnected = Boolean(address) || hookConnected;
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
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
    onStatus?.('pending', 'Transaction pending...');

    try {
      // Initialize Base Account SDK
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

      const provider = sdk.getProvider();

      // Smart accounts (4337): batch all calls into a single user operation
      // via wallet_sendCalls (EIP-5792) to avoid AA25 nonce errors that occur
      // when sending sequential eth_sendTransaction calls.
      let lastTxHash: string | undefined;

      if (calls.length === 0) {
        throw new Error('No transaction calls provided');
      }

      if (calls.length > 1) {
        // Batch via wallet_sendCalls — single user operation, no nonce issues.
        // Uses the same param format as lib/transaction/batchTransactions.ts
        // which is proven to work with Coinbase Smart Wallet.
        const batchResult = (await provider.request({
          method: 'wallet_sendCalls',
          params: {
            calls: calls.map(call => ({
              to: call.to,
              data: call.data,
              value: call.value || '0x0',
            })),
            atomicRequired: true,
            gasless: true,
          },
        })) as { transactionHash?: string; hash?: string } | string;

        // Extract tx hash — Coinbase Smart Wallet returns { transactionHash }
        const txHash = (
          typeof batchResult === 'string'
            ? batchResult
            : (batchResult as { transactionHash?: string; hash?: string })?.transactionHash
              || (batchResult as { transactionHash?: string; hash?: string })?.hash
        ) as Hex | undefined;

        if (!txHash) {
          throw new Error('No transaction hash returned from batch. Try again.');
        }

        // Wait for on-chain confirmation
        const receipt = await basePublicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 180_000,
        });

        if (receipt.status !== 'success') {
          throw new Error('Batch transaction reverted on-chain. Try again in a moment.');
        }

        lastTxHash = txHash;
        console.log('Batch transaction confirmed:', txHash);
      } else if (calls.length === 1) {
        // Single call — use eth_sendTransaction directly
        const result = (await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: calls[0].to,
            value: calls[0].value,
            data: calls[0].data,
            chainId: numberToHex(base.id),
          }],
        })) as Hex;

        const receipt = await basePublicClient.waitForTransactionReceipt({
          hash: result,
          timeout: 180_000,
        });

        if (receipt.status !== 'success') {
          throw new Error('Transaction reverted on-chain. Try again in a moment.');
        }

        lastTxHash = result;
        console.log('Transaction confirmed:', result);
      }
      setStatus('success');
      setMessage('Transaction successful!');
      onStatus?.('success', 'Transaction successful!', { lastTxHash });
    } catch (error: any) {
      // Safely serialize error to avoid BigInt serialization issues
      const safeError = {
        message: error?.message || 'Unknown error',
        code: error?.code,
        name: error?.name
      };
      console.error('Transaction failed:', safeError);
      setStatus('error');
      
      let errorMessage = 'Transaction failed';
      if (error?.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error?.code === 5740) {
        errorMessage = 'Transaction too large for wallet to process';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setMessage(errorMessage);
      onStatus?.('error', errorMessage);
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [isConnected, address, calls, onStatus]);

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
              <span className="text-sm text-zinc-300">
                Confirm in your wallet, then wait for on-chain confirmation…
              </span>
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
