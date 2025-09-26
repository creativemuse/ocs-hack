'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useSessionToken } from '@/hooks/useSessionToken';
import { Coins, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WalletFundingProps {
  className?: string;
}

export default function WalletFunding({ className = '' }: WalletFundingProps) {
  const { address } = useAccount();
  const { getSessionToken, isLoading, error } = useSessionToken();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showFunding, setShowFunding] = useState(false);

  const handleGetSessionToken = async () => {
    if (!address) return;
    
    try {
      const token = await getSessionToken(address);
      setSessionToken(token);
      setShowFunding(true);
    } catch (err) {
      console.error('Failed to get session token:', err);
    }
  };

  if (!address) {
    return (
      <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
        <CardContent className="p-4">
          <div className="text-center text-gray-400">
            <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Connect your wallet to access funding options</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showFunding && sessionToken) {
    return (
      <Card className={`bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Coins className="h-5 w-5 text-green-400" />
            Fund Your Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300 text-center">
            Choose how you'd like to add funds to your wallet:
          </div>
          
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-green-400 text-sm mb-2">
                ✅ Session token ready!
              </div>
              <div className="text-xs text-gray-400 mb-4">
                Session token: {sessionToken.substring(0, 20)}...
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFunding(false)}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Back to Options
            </Button>
          </div>
          
          {error && (
            <div className="text-red-400 text-xs text-center">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Coins className="h-5 w-5 text-yellow-400" />
          Wallet Funding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-300 text-center">
          Need funds to play? Add crypto to your wallet easily.
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={handleGetSessionToken}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Funding Options
              </>
            )}
          </Button>
          
          {error && (
            <div className="text-red-400 text-xs text-center">
              {error}
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-400 text-center">
          Powered by Coinbase Onramp
        </div>
      </CardContent>
    </Card>
  );
}
