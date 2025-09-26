'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSessionToken } from '@/hooks/useSessionToken';
import { useAccount } from 'wagmi';
import { generateFundingUrl } from '@/lib/utils/funding';
import TrialStatusDisplay from './TrialStatusDisplay';
import GamePayment from './GamePayment';
import { Gamepad2, Crown, Coins, Play } from 'lucide-react';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect, WalletDropdownFundLink } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Address, Identity } from '@coinbase/onchainkit/identity';

interface GameEntryProps {
  onGameStart: (options: { isTrial: boolean }) => void;
  entryToken?: string | null;
  className?: string;
  playerModeChoice?: 'trial' | 'paid';
}

export default function GameEntry({ onGameStart, entryToken, className = '', playerModeChoice = 'trial' }: GameEntryProps) {
  const { address } = useAccount();
  const { trialStatus, isLoading: trialLoading, incrementTrialGame } = useTrialStatus(address, entryToken || undefined);
  const { getSessionToken, isLoading: sessionLoading, error: sessionError } = useSessionToken();
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundingUrl, setFundingUrl] = useState<string | null>(null);
  const [fundingSuccess, setFundingSuccess] = useState(false);

  const handleStartGame = async () => {
    if (playerModeChoice === 'trial' && trialStatus.isTrialActive) {
      // Trial player - start game immediately
      await incrementTrialGame();
      onGameStart({ isTrial: true });
    } else if (playerModeChoice === 'paid') {
      // Paid player - check if wallet is connected
      if (!address) {
        // No wallet connected - show wallet connection prompt
        setError('Please connect your wallet to play in Paid Mode');
        return;
      }
      // Wallet connected - show payment flow
      setShowPayment(true);
    } else {
      // Trial exhausted or other case - show payment flow
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = () => {
    setError(null);
    setShowPayment(false);
    onGameStart({ isTrial: false });
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleBackToEntry = () => {
    setShowPayment(false);
    setError(null);
  };

  const handleGenerateFundingUrl = async () => {
    if (!address) return;
    
    try {
      const sessionToken = await getSessionToken(address);
      const url = generateFundingUrl({
        walletAddress: address,
        sessionToken: sessionToken
      });
      
      console.log('Generated funding URL with session token:', url);
      console.log('Session token (first 20 chars):', sessionToken.substring(0, 20) + '...');
      
      setFundingUrl(url);
      
      // Automatically open the funding URL in a popup after generating the session token
      const popup = window.open(
        url,
        'coinbase-funding',
        'width=500,height=700,scrollbars=yes,resizable=yes,noopener,noreferrer'
      );
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.warn('Popup blocked - opening in new tab instead');
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // Show success feedback briefly
        setFundingSuccess(true);
        setTimeout(() => setFundingSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to generate funding URL:', err);
    }
  };


  if (trialLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-purple-500/20 rounded w-3/4"></div>
              <div className="h-3 bg-blue-500/20 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-purple-500/20 rounded w-1/2"></div>
              <div className="h-4 bg-blue-500/20 rounded w-3/4"></div>
              <div className="h-10 bg-gray-500/20 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className={`space-y-4 ${className}`}>
        <GamePayment
          onPaymentComplete={handlePaymentSuccess}
          onBack={handleBackToEntry}
        />
        {error && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-4">
              <div className="text-red-400 text-sm text-center">{error}</div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Show trial status only if player chose trial mode */}
      {playerModeChoice === 'trial' && (
        <TrialStatusDisplay walletAddress={address} entryToken={entryToken} />
      )}
      
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            {playerModeChoice === 'trial' && trialStatus.isTrialActive ? (
              <>
                <Gamepad2 className="h-5 w-5 text-green-400" />
                Trial Mode
              </>
            ) : playerModeChoice === 'paid' ? (
              <>
                <Crown className="h-5 w-5 text-yellow-400" />
                Paid Mode
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 text-yellow-400" />
                Normal Mode
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {playerModeChoice === 'trial' && trialStatus.isTrialActive ? (
            <>
              <div className="text-sm text-gray-300 text-center">
                You have <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {trialStatus.gamesRemaining}
                </Badge> free plays remaining!
              </div>
              <Button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white cursor-pointer"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Free Game
              </Button>
            </>
          ) : playerModeChoice === 'paid' ? (
            <>
              {/* Wallet Component */}
              <div className="mb-4">
                <div className="text-sm text-gray-300 text-center mb-3">
                  {!address ? 'Connect your wallet to play in Paid Mode' : 'Wallet Connected'}
                </div>
                <div className="flex justify-center">
                  <Wallet>
                    <ConnectWallet>
                      <Avatar className="h-6 w-6" />
                      <Name />
                    </ConnectWallet>
                    <WalletDropdown>
                      <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                        <Avatar />
                        <Name />
                        <Address className="text-gray-400" />
                      </Identity>
                      <button
                        onClick={handleGenerateFundingUrl}
                        disabled={sessionLoading}
                        className="w-full px-3 py-2 text-left text-sm cursor-pointer hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                      >
                        {sessionLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Opening funding...
                          </>
                        ) : fundingSuccess ? (
                          <>
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            Funding opened!
                          </>
                        ) : (
                          <>
                            <Coins className="h-3 w-3" />
                            Add Funds
                          </>
                        )}
                      </button>
                      {sessionError && (
                        <div className="px-3 py-2 text-xs text-red-400">
                          {sessionError}
                        </div>
                      )}
                      <WalletDropdownDisconnect />
                    </WalletDropdown>
                  </Wallet>
                </div>
              </div>

              {/* USDC Purchase Info */}
              <div className="flex items-center justify-center gap-2 text-sm mb-4">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">Entry Fee: 1 USDC</span>
              </div>

              {!address ? (
                <div className="text-center">
                  <div className="text-yellow-400 text-sm font-medium mb-2">
                    🔗 Wallet Required
                  </div>
                  <div className="text-xs text-gray-400">
                    Please connect your wallet above to continue
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-300 text-center mb-4">
                    Ready to compete for rewards?
                  </div>
                  <Button
                    onClick={handleStartGame}
                    className="w-full !bg-gradient-to-r !from-yellow-500 !to-orange-500 hover:!from-yellow-400 hover:!to-orange-400 !text-white border-0 shadow-lg cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #eab308, #f97316)' }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Paid Game
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="text-sm text-gray-300 text-center">
                Ready to compete for rewards?
              </div>
              <div className="flex items-center justify-center gap-2 text-sm mb-4">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">Entry Fee: 1 USDC</span>
              </div>
              <Button
                onClick={handleStartGame}
                className="w-full !bg-gradient-to-r !from-yellow-500 !to-orange-500 hover:!from-yellow-400 hover:!to-orange-400 !text-white border-0 shadow-lg cursor-pointer"
                style={{ background: 'linear-gradient(to right, #eab308, #f97316)' }}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Normal Game
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
