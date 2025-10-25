'use client';

import { useState } from 'react';
import { useContractUSDCBalance } from '@/hooks/useContractUSDCBalance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ContractBalanceDebug() {
  const { 
    balance, 
    balanceWei, 
    isLoading, 
    error, 
    symbol, 
    decimals, 
    refreshBalance 
  } = useContractUSDCBalance();

  const [debugInfo, setDebugInfo] = useState<any>(null);

  const getDebugInfo = () => {
    const info = {
      environment: {
        NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS,
        NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
        NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
      },
      contract: {
        address: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13',
        usdcAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      },
      balance: {
        wei: balanceWei?.toString(),
        formatted: balance,
        symbol,
        decimals,
        isLoading,
        error: error?.toString(),
      },
      timestamp: new Date().toISOString(),
    };
    setDebugInfo(info);
    return info;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Contract Balance Debug
          <Badge variant={error ? "destructive" : isLoading ? "secondary" : "default"}>
            {error ? "Error" : isLoading ? "Loading" : "Connected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance Display */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current Balance</h3>
          <div className="text-2xl font-mono">
            {error ? (
              <span className="text-red-500">Error: {error}</span>
            ) : isLoading ? (
              <span className="text-yellow-500">Loading...</span>
            ) : (
              <span className="text-green-500">{balance.toFixed(6)} {symbol}</span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Wei: {balanceWei?.toString() || 'N/A'}
          </div>
        </div>

        {/* Contract Information */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Contract Information</h3>
          <div className="space-y-1 text-sm">
            <div><strong>Contract Address:</strong> {process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13'}</div>
            <div><strong>USDC Address:</strong> 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913</div>
            <div><strong>Network:</strong> Base Mainnet (Chain ID: 8453)</div>
            <div><strong>RPC URL:</strong> {process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={refreshBalance} disabled={isLoading}>
            🔄 Refresh Balance
          </Button>
          <Button onClick={getDebugInfo} variant="outline">
            🐛 Get Debug Info
          </Button>
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Information</h3>
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Troubleshooting Tips */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold mb-2">Troubleshooting Tips</h3>
          <ul className="text-sm space-y-1">
            <li>• Check if the contract address is correct and deployed</li>
            <li>• Verify the RPC URL is accessible</li>
            <li>• Ensure the contract has USDC tokens</li>
            <li>• Check browser console for detailed errors</li>
            <li>• Verify network connection and wallet status</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
