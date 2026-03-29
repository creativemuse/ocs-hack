'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { Copy, CheckCircle, Shield, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface SubAccountDisplayProps {
  className?: string;
  showActions?: boolean;
}

export default function SubAccountDisplay({ 
  className = '',
  showActions = true 
}: SubAccountDisplayProps) {
  const { address, subAccountAddress, universalAddress, isConnected } = useBaseAccount();
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

  const openInExplorer = (address: string | null) => {
    if (!address) return;
    window.open(`https://basescan.org/address/${address}`, '_blank');
  };

  if (!isConnected || !address) {
    return null;
  }

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
              className="h-6 w-6 p-0"
            >
              {copied === 'sub' ? (
                <CheckCircle className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            {showActions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openInExplorer(subAccountAddress)}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="h-3 w-3" />
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
                className="h-6 w-6 p-0"
              >
                {copied === 'universal' ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              {showActions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInExplorer(universalAddress)}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

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
