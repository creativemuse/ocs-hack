'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, DollarSign, Zap, Settings } from 'lucide-react';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import {
  isERC20GasEnabled,
  getERC20GasConfig,
  estimateGasCostInUSDC,
  checkUSDCBalanceForGas
} from '@/lib/base-account/erc20Gas';

export default function ERC20GasManager() {
  const { address, isConnected } = useBaseAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [gasConfig, setGasConfig] = useState<{
    isEnabled: boolean;
    usdcAddress?: string;
    paymasterEndpoint?: string;
    error?: string;
  } | null>(null);
  const [gasEstimate, setGasEstimate] = useState<{
    gasCost: string;
    gasLimit: string;
    gasPrice: string;
    error?: string;
  } | null>(null);
  const [balanceCheck, setBalanceCheck] = useState<{
    hasSufficientBalance: boolean;
    currentBalance: string;
    requiredBalance: string;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGasInfo = async () => {
    if (!isConnected || !address) {
      setGasConfig(null);
      setGasEstimate(null);
      setBalanceCheck(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get gas configuration
      const config = getERC20GasConfig();
      setGasConfig(config);

      if (config.isEnabled) {
        // Estimate gas cost for a sample transaction
        const estimate = await estimateGasCostInUSDC({
          to: '0x0000000000000000000000000000000000000000', // Sample address
          data: '0x', // Sample data
          value: '0'
        });
        setGasEstimate(estimate);

        // Check USDC balance for gas
        const balance = await checkUSDCBalanceForGas(address, estimate.gasCost);
        setBalanceCheck(balance);
      }
    } catch (err: any) {
      console.error('Error fetching gas info:', err);
      setError(err.message || 'Failed to fetch gas information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGasInfo();
    const interval = setInterval(fetchGasInfo, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [isConnected, address]);

  if (!isConnected) {
    return null; // Only show if connected
  }

  return (
    <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <DollarSign className="h-5 w-5 text-green-400" />
          ERC20 Gas Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Status:</span>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : gasConfig?.isEnabled ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            )}
          </div>

          {gasConfig?.error && (
            <div className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {gasConfig.error}
            </div>
          )}
        </div>

        {/* Gas Cost Estimation */}
        {gasEstimate && !gasEstimate.error && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Estimated Gas Cost:</span>
              <span className="font-medium text-white">
                {parseFloat(gasEstimate.gasCost).toFixed(6)} USDC
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Gas Limit:</span>
              <span className="font-medium text-white">
                {parseInt(gasEstimate.gasLimit).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* USDC Balance Check */}
        {balanceCheck && !balanceCheck.error && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">USDC Balance:</span>
              <span className="font-medium text-white">
                {parseFloat(balanceCheck.currentBalance).toFixed(2)} USDC
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Required for Gas:</span>
              <Badge
                variant={balanceCheck.hasSufficientBalance ? "default" : "destructive"}
                className={balanceCheck.hasSufficientBalance ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}
              >
                {balanceCheck.hasSufficientBalance ? 'Sufficient' : 'Insufficient'}
              </Badge>
            </div>
          </div>
        )}

        {/* Benefits Info */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="text-xs text-green-300">
            <p className="font-medium mb-1">ERC20 Gas Benefits:</p>
            <ul className="space-y-1 text-green-200/80">
              <li>• Pay gas fees in USDC instead of ETH</li>
              <li>• No need to maintain ETH balance</li>
              <li>• Simplified user experience</li>
              <li>• Automatic gas sponsorship via paymaster</li>
            </ul>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}

        {/* Configuration Details */}
        {gasConfig && gasConfig.isEnabled && (
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>USDC Address:</span>
                <span className="font-mono text-white">
                  {gasConfig.usdcAddress?.slice(0, 6)}...{gasConfig.usdcAddress?.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Paymaster:</span>
                <span className="font-mono text-white">
                  {gasConfig.paymasterEndpoint ? 'Configured' : 'Not Set'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={fetchGasInfo}
          disabled={isLoading}
          variant="outline"
          className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Refresh Gas Info
        </Button>
      </CardContent>
    </Card>
  );
}
