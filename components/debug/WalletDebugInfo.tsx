'use client';

import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function WalletDebugInfo() {
  const { address, isConnected, chainId } = useBaseAccount();
  const { balance, hasEnoughForEntry, isLoading, error } = useUSDCBalance();

  const getStatusIcon = (condition: boolean, loading: boolean = false) => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    return condition ? 
      <CheckCircle className="h-4 w-4 text-green-400" /> : 
      <XCircle className="h-4 w-4 text-red-400" />;
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Wallet Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Wallet Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Wallet Connected</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(isConnected)}
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Address</span>
          <span className="text-xs text-gray-400 font-mono">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}
          </span>
        </div>

        {/* Chain ID */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Chain ID</span>
          <span className="text-xs text-gray-400">
            {chainId || 'Unknown'}
          </span>
        </div>

        {/* USDC Balance Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">USDC Balance</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(!isLoading && !error)}
            <span className="text-xs text-gray-400">
              {isLoading ? 'Loading...' : error ? 'Error' : `${balance.toFixed(2)} USDC`}
            </span>
          </div>
        </div>

        {/* Sufficient Funds Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Sufficient Funds</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(hasEnoughForEntry, isLoading)}
            <Badge 
              variant={hasEnoughForEntry ? "default" : "destructive"}
              className={`text-xs ${hasEnoughForEntry ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
            >
              {hasEnoughForEntry ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
