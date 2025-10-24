'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useOneClickBuy } from '@/hooks/useOneClickBuy';
import { Coins, ExternalLink, DollarSign, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WalletFundingProps {
  className?: string;
}

export default function WalletFunding({ className = '' }: WalletFundingProps) {
  const { address } = useAccount();
  const { generateBuyUrl, openOnramp, isLoading, error, quoteData, clearError } = useOneClickBuy();
  const [showQuote, setShowQuote] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const handleFundWallet = useCallback(async () => {
    if (!address) return;
    
    // Clear any previous errors and reset state
    clearError();
    setShowQuote(false);
    setIsOpening(false);
    
    try {
      const result = await generateBuyUrl(address, {
        paymentAmount: '5.00',
        paymentCurrency: 'USD',
        purchaseCurrency: 'USDC',
        purchaseNetwork: 'base',
        paymentMethod: 'CARD',
        country: 'US',
      });
      
      if (result?.url) {
        setShowQuote(true);
        setIsOpening(true);
        
        // Open the onramp immediately - no delay needed
        openOnramp(result.url);
        
        // Reset opening state after a short delay
        setTimeout(() => {
          setIsOpening(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to generate buy URL:', err);
      setIsOpening(false);
    }
  }, [address, generateBuyUrl, openOnramp, clearError]);

  const handleRetry = useCallback(() => {
    setShowQuote(false);
    setIsOpening(false);
    clearError();
  }, [clearError]);

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

  if (showQuote && quoteData) {
    return (
      <Card className={`bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Coins className="h-5 w-5 text-green-400" />
            Buy USDC Quote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300 text-center">
            {isOpening ? 'Opening Coinbase Onramp...' : 'Quote generated successfully'}
          </div>
          
          <div className="space-y-3">
            {/* Quote Preview */}
            <div className="bg-black/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">You'll pay:</span>
                <span className="text-white font-medium">
                  ${quoteData.paymentTotal?.amount} {quoteData.paymentTotal?.currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">You'll receive:</span>
                <span className="text-green-400 font-medium">
                  {quoteData.purchaseAmount?.amount} {quoteData.purchaseAmount?.currency}
                </span>
              </div>
              {quoteData.coinbaseFee && (
                <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-700">
                  <span className="text-gray-500">Coinbase fee:</span>
                  <span className="text-gray-400">
                    ${quoteData.coinbaseFee.amount}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetry}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowQuote(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Back
              </Button>
            </div>
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
            onClick={handleFundWallet}
            disabled={isLoading || isOpening}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating quote...
              </>
            ) : isOpening ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Opening onramp...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Buy $5 USDC
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
