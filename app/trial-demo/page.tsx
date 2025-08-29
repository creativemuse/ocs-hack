'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import TrialStatusDisplay from '@/components/game/TrialStatusDisplay';
import GameEntry from '@/components/game/GameEntry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Gamepad2, Crown } from 'lucide-react';

export default function TrialDemo() {
  const { address } = useAccount();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  const handleGameStart = () => {
    setGameStarted(true);
  };

  const handleGameComplete = () => {
    setGameCompleted(true);
  };

  const handleReset = () => {
    setGameStarted(false);
    setGameCompleted(false);
  };

  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Game Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-white">
              <p className="mb-4">Congratulations! You've completed a game.</p>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                Score: 150 USDC
              </Badge>
            </div>
            <Button onClick={handleReset} className="w-full">
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center flex items-center justify-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Game in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-white">
              <p className="mb-4">Your game is running...</p>
              <div className="animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
            <Button onClick={handleGameComplete} className="w-full">
              Complete Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center flex items-center justify-center gap-2">
              <Crown className="h-5 w-5" />
              Trial System Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-white mb-4">
              <p className="text-sm text-gray-300">
                {address ? 'Wallet Connected' : 'No Wallet Connected'}
              </p>
              {address && (
                <p className="text-xs text-gray-400 mt-1">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <GameEntry onGameStart={handleGameStart} />
      </div>
    </div>
  );
}
