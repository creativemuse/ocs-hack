'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import GuestModeEntry from '@/components/game/GuestModeEntry';
import GuestProfile from '@/components/game/GuestProfile';
import GamePayment from '@/components/game/GamePayment';
import { GuestSessionManager } from '@/lib/utils/guestSessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Crown, Sparkles, Users, Trophy, Zap, Star } from 'lucide-react';

type GameMode = 'entry' | 'guest-game' | 'guest-profile' | 'wallet-connect' | 'premium-game' | 'completed';

export default function GuestDemo() {
  const { address } = useAccount();
  const [gameMode, setGameMode] = useState<GameMode>('entry');
  const [guestName, setGuestName] = useState('');
  const [gameScore, setGameScore] = useState(0);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);

  // Check if we should show profile directly
  const [showProfileDirectly, setShowProfileDirectly] = useState(false);

  // Check URL parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('profile') === 'true') {
        setShowProfileDirectly(true);
        setGameMode('guest-profile');
      }
    }
  }, []);

  const handleGuestStart = (name: string) => {
    setGuestName(name);
    GuestSessionManager.createGuestPlayer(name);
    setGameMode('guest-game');
  };

  const handleWalletConnect = () => {
    setGameMode('wallet-connect');
  };

  const handleGameComplete = (score: number) => {
    setGameScore(score);
    const updatedPlayer = GuestSessionManager.recordGameResult(score);
    
    // Check for new achievements
    if (updatedPlayer) {
      const newAchievements = updatedPlayer.achievements.filter(
        achievementId => !GuestSessionManager.getPlayerStats()?.achievements || 
        updatedPlayer.achievements.length > (GuestSessionManager.getPlayerStats()?.achievements || 0)
      );
      
      if (newAchievements.length > 0) {
        setShowAchievement(newAchievements[0]);
        setTimeout(() => setShowAchievement(null), 3000);
      }
    }
    
    setGameMode('completed');
  };

  const handlePaymentSuccess = () => {
    setGameMode('premium-game');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Could show error toast here
  };

  const handleReset = () => {
    setGameMode('entry');
    setGameScore(0);
    setShowAchievement(null);
  };

  // Achievement notification
  if (showAchievement) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30 animate-pulse">
          <CardContent className="p-6 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-white mb-2">Achievement Unlocked!</h3>
            <p className="text-green-400 font-medium">{showAchievement}</p>
            <Button onClick={() => setShowAchievement(null)} className="mt-4">
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game completed screen
  if (gameMode === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Game Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-white">
              <p className="mb-4">Great job, {guestName}!</p>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-4 py-2">
                Score: {gameScore} USDC
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => setGameMode('guest-profile')} 
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white"
              >
                <Trophy className="h-4 w-4 mr-2" />
                View Profile & Achievements
              </Button>
              
              <Button 
                onClick={() => setGameMode('guest-game')} 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Play Again
              </Button>
              
              <Button 
                onClick={handleReset} 
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Back to Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guest game in progress
  if (gameMode === 'guest-game') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center flex items-center justify-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Guest Game in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-white">
              <p className="mb-4">Playing as <span className="font-bold text-green-400">{guestName}</span></p>
              <div className="animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => handleGameComplete(Math.floor(Math.random() * 500) + 100)} 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
              >
                Complete Game (Demo)
              </Button>
              
              <Button 
                onClick={() => setGameMode('guest-profile')} 
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                View Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guest profile
  if (gameMode === 'guest-profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <GuestProfile
            onConnectWallet={() => setGameMode('wallet-connect')}
            onBackToGame={() => setGameMode('guest-game')}
          />
        </div>
      </div>
    );
  }

  // Wallet connect / payment
  if (gameMode === 'wallet-connect') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <GamePayment
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
          <Button
            onClick={() => setGameMode('entry')}
            variant="outline"
            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  // Premium game
  if (gameMode === 'premium-game') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Premium Game Active
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-white">
              <p className="mb-4">Playing for real USDC prizes!</p>
              <div className="animate-pulse">
                <div className="h-4 bg-yellow-500/20 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-yellow-500/20 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="text-xs text-yellow-300">
                <p className="font-medium mb-1">Premium Benefits Active:</p>
                <ul className="space-y-1 text-yellow-200/80">
                  <li>• Real USDC prizes</li>
                  <li>• Permanent leaderboard ranking</li>
                  <li>• Exclusive achievements</li>
                </ul>
              </div>
            </div>
            
            <Button 
              onClick={handleReset} 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white"
            >
              Back to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main entry screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-white">
              <Sparkles className="h-6 w-6 text-purple-400" />
              Guest Mode Demo
            </CardTitle>
            <p className="text-gray-300 text-sm">
              Experience the innovative way to play without a wallet!
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center text-white mb-4">
              <p className="text-sm text-gray-300">
                {address ? 'Wallet Connected' : 'No Wallet Required'}
              </p>
              {address && (
                <p className="text-xs text-gray-400 mt-1">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <GuestModeEntry
          onGuestStart={handleGuestStart}
          onWalletConnect={handleWalletConnect}
        />
      </div>
    </div>
  );
}
