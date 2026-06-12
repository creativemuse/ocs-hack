'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useETHBalance } from '@/hooks/useETHBalance';
import { Copy, CheckCircle, Shield, ExternalLink, AlertCircle, Fuel } from 'lucide-react';
import { useState } from 'react';

interface SubAccountDisplayProps {
  className?: string;
  showActions?: boolean;
  /** Called when user taps "Add ETH for gas" */
  onFundEth?: () => void;
  /** Whether paymaster is configured (gas may still be sponsored for eligible users). */
  paymasterConfigured?: boolean;
}

const iconButtonClass =
  'h-6 w-6 p-0 text-white hover:text-white hover:bg-white/10';

export default function SubAccountDisplay({
  className = '',
  showActions = true,
  onFundEth,
  paymasterConfigured = Boolean(process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT),
}: SubAccountDisplayProps) {
  const { address, subAccountAddress, universalAddress, isConnected } = useBaseAccount();
  const { balance: ethBalance, hasEnoughForGas, isLoading: ethLoading } = useETHBalance();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string | null, type: string) => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const openInExplorer = (addr: string | null) => {
    if (!addr) return;
    window.open(`https://basescan.org/address/${addr}`, '_blank', 'noopener,noreferrer');
  };

  if (!isConnected || !address) {
    return null;
  }

  const showGasWarning = !ethLoading && !hasEnoughForGas;

  return (
    <Card className={`bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Shield className="h-5 w-5 text-blue-400" />
          Base Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sub Account (Primary) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Sub Account (Active)</span>
            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
              Primary
            </Badge>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
            <code className="text-xs text-white font-mono flex-1">
              {subAccountAddress?.slice(0, 6)}...{subAccountAddress?.slice(-4)}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(subAccountAddress, 'sub')}
              className={iconButtonClass}
              aria-label="Copy sub account address"
            >
              {copied === 'sub' ? (
                <CheckCircle className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3 text-white" />
              )}
            </Button>
            {showActions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openInExplorer(subAccountAddress)}
                className={iconButtonClass}
                aria-label="View sub account on BaseScan"
              >
                <ExternalLink className="h-3 w-3 text-white" />
              </Button>
            )}
          </div>
        </div>

        {/* Universal Account */}
        {universalAddress && universalAddress !== subAccountAddress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Universal Account</span>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Parent
              </Badge>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
              <code className="text-xs text-white font-mono flex-1">
                {universalAddress?.slice(0, 6)}...{universalAddress?.slice(-4)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(universalAddress, 'universal')}
                className={iconButtonClass}
                aria-label="Copy universal account address"
              >
                {copied === 'universal' ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-white" />
                )}
              </Button>
              {showActions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInExplorer(universalAddress)}
                  className={iconButtonClass}
                  aria-label="View universal account on BaseScan"
                >
                  <ExternalLink className="h-3 w-3 text-white" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ETH balance for gas */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-gray-300">ETH (gas)</span>
            </div>
            {!ethLoading && hasEnoughForGas && (
              <CheckCircle className="h-4 w-4 text-green-400" aria-hidden />
            )}
            {showGasWarning && (
              <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden />
            )}
          </div>
          <div className="text-sm font-medium text-white">
            {ethLoading ? '...' : `${ethBalance.toFixed(6)} ETH`}
          </div>
          {showGasWarning && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 space-y-2">
              <p className="text-xs text-amber-200">
                {paymasterConfigured
                  ? 'Gas sponsorship may not apply to your account. Add a small amount of ETH to cover network fees (~$0.02).'
                  : 'Add a small amount of ETH to your wallet to cover network fees (~$0.02 per transaction).'}
              </p>
              {onFundEth && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onFundEth}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs"
                >
                  Add ETH for gas
                </Button>
              )}
            </div>
          )}
          {!showGasWarning && !ethLoading && paymasterConfigured && (
            <p className="text-[10px] text-gray-400">
              Coinbase One members may get sponsored gas. Others use ETH above.
            </p>
          )}
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-xs text-gray-400">Network</span>
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            Base Mainnet
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
