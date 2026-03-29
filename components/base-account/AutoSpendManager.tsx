'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Zap, Shield, Settings } from 'lucide-react';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import {
  configureAutoSpend,
  checkAutoSpendStatus,
  revokeAutoSpend,
  getAutoSpendConfig
} from '@/lib/base-account/autoSpend';

export default function AutoSpendManager() {
  const { isConnected } = useBaseAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [autoSpendStatus, setAutoSpendStatus] = useState<{
    isConfigured: boolean;
    allowance?: string;
    spender?: string;
    error?: string;
  } | null>(null);
  const [config, setConfig] = useState<{
    universalAddress?: string;
    subAccountAddress?: string;
    tokenAddress?: string;
    amount?: string;
    duration?: number;
    isActive?: boolean;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!isConnected) {
      setAutoSpendStatus(null);
      setConfig(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [status, configData] = await Promise.all([
        checkAutoSpendStatus(),
        getAutoSpendConfig()
      ]);

      setAutoSpendStatus(status);
      setConfig(configData);
    } catch (err: any) {
      console.error('Error fetching Auto Spend status:', err);
      setError(err.message || 'Failed to fetch Auto Spend status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleConfigure = async () => {
    setIsConfiguring(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await configureAutoSpend();
      
      if (result.success) {
        setSuccessMessage('Auto Spend Permissions configured successfully!');
        await fetchStatus(); // Refresh status
      } else {
        setError(result.error || 'Failed to configure Auto Spend Permissions');
      }
    } catch (err: any) {
      console.error('Error configuring Auto Spend:', err);
      setError(err.message || 'Failed to configure Auto Spend Permissions');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await revokeAutoSpend();
      
      if (result.success) {
        setSuccessMessage('Auto Spend Permissions revoked successfully!');
        await fetchStatus(); // Refresh status
      } else {
        setError(result.error || 'Failed to revoke Auto Spend Permissions');
      }
    } catch (err: any) {
      console.error('Error revoking Auto Spend:', err);
      setError(err.message || 'Failed to revoke Auto Spend Permissions');
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isConnected) {
    return null; // Only show if connected
  }

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    return `${days} days`;
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Zap className="h-5 w-5 text-blue-400" />
          Auto Spend Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Status:</span>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : autoSpendStatus?.isConfigured ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>

          {config && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Amount:</span>
                <span className="font-medium text-white">{config.amount} USDC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Duration:</span>
                <span className="font-medium text-white">
                  {config.duration ? formatDuration(config.duration) : 'N/A'}
                </span>
              </div>
            </>
          )}

          {autoSpendStatus?.allowance && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Current Allowance:</span>
              <span className="font-medium text-white">
                {parseFloat(autoSpendStatus.allowance).toFixed(2)} USDC
              </span>
            </div>
          )}
        </div>

        {/* Benefits Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-1">Auto Spend Benefits:</p>
            <ul className="space-y-1 text-blue-200/80">
              <li>• Automatic funding from universal account</li>
              <li>• Seamless gameplay without manual approvals</li>
              <li>• Enhanced security with sub-account isolation</li>
              <li>• Gasless transactions via paymaster</li>
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

        {/* Success Message */}
        {successMessage && (
          <div className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {successMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleConfigure}
            disabled={isConfiguring || isLoading || autoSpendStatus?.isConfigured}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white"
          >
            {isConfiguring ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {autoSpendStatus?.isConfigured ? 'Already Configured' : 'Enable Auto Spend'}
          </Button>
          
          <Button
            onClick={handleRevoke}
            disabled={isRevoking || isLoading || !autoSpendStatus?.isConfigured}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            {isRevoking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Configuration Details */}
        {config && (config.universalAddress || config.subAccountAddress) && (
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Universal Account:</span>
                <span className="font-mono text-white">
                  {config.universalAddress?.slice(0, 6)}...{config.universalAddress?.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sub Account:</span>
                <span className="font-mono text-white">
                  {config.subAccountAddress?.slice(0, 6)}...{config.subAccountAddress?.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
