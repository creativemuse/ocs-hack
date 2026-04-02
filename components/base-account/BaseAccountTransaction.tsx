'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';
import { numberToHex } from 'viem';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface BaseAccountTransactionProps {
  calls: Array<{
    to: `0x${string}`;
    value: `0x${string}`;
    data: `0x${string}`;
  }>;
  onStatus?: (status: 'pending' | 'success' | 'error', message?: string) => void;
  children: React.ReactNode;
  className?: string;
}

export default function BaseAccountTransaction({
  calls,
  onStatus,
  children,
  className = ''
}: BaseAccountTransactionProps) {
  const { isConnected, address } = useBaseAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleTransaction = useCallback(async () => {
    if (!isConnected || !address) {
      onStatus?.('error', 'Not connected to Base Account');
      return;
    }

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

      // Batch all calls into a single atomic operation using EIP-5792 wallet_sendCalls.
      // This ensures approve + joinBattle execute together, preventing
      // "execution reverted" from the approval not being mined before joinBattle runs.
      const result = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '1',
          from: address,
          chainId: numberToHex(base.id),
          calls: calls.map(call => ({
            to: call.to,
            value: call.value,
            data: call.data,
          })),
        }]
      });
      const results = [result];

      console.log('Transactions sent:', results);
      setStatus('success');
      setMessage('Transaction successful!');
      onStatus?.('success', 'Transaction successful!');
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
    }
  }, [isConnected, address, calls, onStatus]);

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
      <Button asChild>
        <div
          onClick={(!isConnected || isLoading) ? undefined : handleTransaction}
          aria-disabled={!isConnected || isLoading}
          role="button"
          className={`w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${(!isConnected || isLoading) ? 'pointer-events-none opacity-50' : ''}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if ((!isConnected || isLoading)) return;
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
}
