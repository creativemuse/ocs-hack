'use client';

import { Buy } from '@coinbase/onchainkit/buy';
import type { Token } from '@coinbase/onchainkit/token';

interface GamePaymentProps {
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

export default function GamePayment({ onPaymentComplete, onBack }: GamePaymentProps) {
  // Define USDC token for Base network
  const usdcToken: Token = {
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
    image: 'https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/44/2b/442b80bd16af0c0d9b22e03a16753823fe826e5bfd457292b55fa0ba8c1ba213-ZWUzYjJmZGUtMDYxNy00NDcyLTg0NjQtMWI4OGEwYjBiODE2',
    chainId: 8453, // Base mainnet
  };

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

        {/* Buy Component */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="text-center mb-4">
            <h3 className="text-white text-lg font-semibold mb-2">
              Secure USDC Purchase
            </h3>
            <p className="text-gray-400 text-sm">
              Purchase USDC using Apple Pay, debit card, or your Coinbase account
            </p>
          </div>
          
          <Buy 
            toToken={usdcToken}
            isSponsored={true} // Enable gas sponsorship for better UX
          />
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
