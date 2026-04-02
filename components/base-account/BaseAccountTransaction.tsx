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

      // Smart accounts (4337): each user op bumps the account nonce on-chain only after
      // inclusion. Sending approve + joinBattle back-to-back causes AA25 invalid account nonce
      // on the second op — wait for each receipt before the next send.
      const results: string[] = [];
      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const result = (await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: call.to,
            value: call.value,
            data: call.data,
            chainId: numberToHex(base.id),
          }]
        })) as Hex;

        results.push(result);

        const receipt = await basePublicClient.waitForTransactionReceipt({
          hash: result,
          timeout: 180_000,
        });

        if (receipt.status !== 'success') {
          throw new Error(
            `Transaction ${i + 1} of ${calls.length} reverted on-chain. Try again in a moment.`
          );
        }
      }

      const lastTxHash = results.length > 0 ? results[results.length - 1] : undefined;
      console.log('Transactions confirmed:', results);
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
