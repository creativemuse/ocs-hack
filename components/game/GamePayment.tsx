'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';

interface GamePaymentProps {
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

export default function GamePayment({ onPaymentComplete, onBack }: GamePaymentProps) {
  const { address } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityMode, setSecurityMode] = useState<'secure' | 'standard'>('standard');
  const [onrampUrl, setOnrampUrl] = useState<string | null>(null);

  // Generate session token when wallet is connected
  useEffect(() => {
    const generateSessionToken = async () => {
      if (!address) {
        setSessionToken(null);
        setSecurityMode('standard');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/session-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress: address }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate session token');
        }

        const data = await response.json();
        setSessionToken(data.sessionToken);
        setSecurityMode('secure');
        
        // Generate onramp URL with session token
        const onrampBaseUrl = 'https://pay.coinbase.com/buy/select-asset';
        const urlParams = new URLSearchParams({
          sessionToken: data.sessionToken,
          defaultAsset: 'USDC',
          defaultNetwork: 'base',
          presetCryptoAmount: '10', // Default amount
          defaultPaymentMethod: 'APPLE_PAY',
        });
        
        const fullOnrampUrl = `${onrampBaseUrl}?${urlParams.toString()}`;
        setOnrampUrl(fullOnrampUrl);
        
        console.log('Session token generated successfully - using secure initialization');
      } catch (error) {
        console.warn('Session token generation failed, falling back to standard mode:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setSecurityMode('standard');
        setSessionToken(null);
        
        // Fallback to standard mode (not recommended for production)
        const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID || "5b09d242-5390-4db3-866f-bfc2ce575821";
        const fallbackUrl = `https://pay.coinbase.com/buy/select-asset?appId=${projectId}&addresses={"${address}":["base"]}&assets=["USDC"]&presetCryptoAmount=10&defaultPaymentMethod=APPLE_PAY`;
        setOnrampUrl(fallbackUrl);
      } finally {
        setIsLoading(false);
      }
    };

    generateSessionToken();
  }, [address]);

  return (
    <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-[390px] md:max-w-[428px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-bold mb-2">Purchase USDC</h1>
          <p className="text-gray-400 text-sm">
            Buy USDC to join the game and compete for prizes
          </p>
        </div>

        {/* Security Mode Indicator */}
        <div className="mb-4">
          <div className={`text-center p-3 rounded-lg ${
            securityMode === 'secure' 
              ? 'bg-green-900/20 border border-green-500/30' 
              : 'bg-yellow-900/20 border border-yellow-500/30'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                securityMode === 'secure' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                securityMode === 'secure' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {securityMode === 'secure' ? 'Secure Mode Active' : 'Standard Mode'}
              </span>
            </div>
            <p className={`text-xs mt-1 ${
              securityMode === 'secure' ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {securityMode === 'secure' 
                ? 'Enhanced security with session tokens' 
                : 'Using standard authentication'
              }
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm text-center">
              {error}
            </p>
          </div>
        )}

        {/* Buy Component */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="text-center mb-4">
            <h3 className="text-white text-lg font-semibold mb-2">
              {isLoading ? 'Initializing...' : 'USDC Purchase'}
            </h3>
            <p className="text-gray-400 text-sm">
              Purchase USDC using Apple Pay, debit card, or your Coinbase account
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-white">Setting up secure connection...</span>
            </div>
          ) : address && onrampUrl ? (
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-white font-medium">Purchase USDC</h4>
                    <p className="text-gray-400 text-sm">Amount: ~$10 USDC</p>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-lg font-bold">USDC</div>
                    <div className="text-gray-400 text-xs">on Base</div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    window.open(onrampUrl, '_blank', 'width=460,height=720,scrollbars=yes,resizable=yes');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>Buy with Coinbase</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  A new window will open with Coinbase Pay
                </p>
              </div>
            </div>
          ) : !address ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Please connect your wallet to continue</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-400">Unable to initialize payment system</p>
            </div>
          )}
        </div>

        {/* Back Button */}
        {onBack && (
          <div className="text-center">
            <button
              onClick={onBack}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Back to Game Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
