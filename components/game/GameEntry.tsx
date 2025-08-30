'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useAccount } from 'wagmi';
import TrialStatusDisplay from './TrialStatusDisplay';
import GamePayment from './GamePayment';
import { Gamepad2, Crown, Coins, Play } from 'lucide-react';

interface GameEntryProps {
  onGameStart: (options: { isTrial: boolean }) => void;
  className?: string;
}

export default function GameEntry({ onGameStart, className = '' }: GameEntryProps) {
  const { address } = useAccount();
  const { trialStatus, isLoading: trialLoading, incrementTrialGame } = useTrialStatus(address);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGame = async () => {
    if (trialStatus.isTrialActive) {
      // Trial player - start game immediately
      await incrementTrialGame();
      onGameStart({ isTrial: true });
    } else {
      // Paid player - show payment flow
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

  if (trialLoading) {
    return (
      <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-purple-500/20 rounded w-1/2"></div>
            <div className="h-4 bg-blue-500/20 rounded w-3/4"></div>
            <div className="h-10 bg-gray-500/20 rounded"></div>
          </div>
        </CardContent>
      </Card>
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
        <Button
          onClick={handleBackToEntry}
          variant="outline"
          className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
        >
          Back to Game Entry
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <TrialStatusDisplay walletAddress={address} />
      
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            {trialStatus.isTrialActive ? (
              <>
                <Gamepad2 className="h-5 w-5 text-green-400" />
                Start Free Game
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 text-yellow-400" />
                Start Normal Game
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trialStatus.isTrialActive ? (
            <>
              <div className="text-sm text-gray-300 text-center">
                You have <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {trialStatus.gamesRemaining}
                </Badge> free plays remaining!
              </div>
              <Button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Free Game
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-300 text-center">
                You've used all free plays. Ready to compete for prizes?
              </div>
              <div className="flex items-center justify-center gap-2 text-sm mb-4">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">Entry Fee: 1 USDC</span>
              </div>
              <Button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white"
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
