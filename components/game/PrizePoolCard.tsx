'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Users, Trophy, Clock, Sparkles } from 'lucide-react';
import type { PrizePool } from '@/types/game';

interface PrizePoolCardProps {
  prizePool: PrizePool;
  onJoinGame: () => void;
  isConnected: boolean;
  isLoading: boolean;
  timeUntilStart?: number;
  className?: string;
}

export default function PrizePoolCard({
  prizePool,
  onJoinGame,
  isConnected,
  isLoading,
  timeUntilStart,
  className = '',
}: PrizePoolCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeUntilStart || 0);

  useEffect(() => {
    if (!timeUntilStart || timeUntilStart <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        return newTime <= 0 ? 0 : newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilStart]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(2)} USDC`;
  };

  // No maximum limit - show current participation level
  const participationRate = Math.min(prizePool.participants / 10, 1) * 100; // Show progress based on 10+ players

  const canJoinPrizePool = isConnected && timeRemaining === 0;
  const isTrialPlayer = prizePool.entryFee === 0;

  return (
    <Card className={`bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white border-0 shadow-2xl ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <span className="text-xl font-bold">Prize Pool</span>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
            <span className="text-sm text-purple-200">Live</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Prize Pool */}
        <div className="text-center">
          <div className="text-4xl font-bold text-yellow-400 mb-2">
            {formatCurrency(prizePool.totalAmount)}
          </div>
          <div className="text-purple-200 text-sm">
            Entry Fee: {formatCurrency(prizePool.entryFee)}
          </div>
        </div>

        {/* Prize Distribution — matches deployed TriviaBattle contract (10% platform fee, then 60/30/10) */}
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-200 mb-3">Prize Distribution</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-yellow-400 font-bold text-lg">
                {formatCurrency(prizePool.distribution.first)}
              </div>
              <div className="text-xs text-gray-300">1st (60%)</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 font-bold text-lg">
                {formatCurrency(prizePool.distribution.second)}
              </div>
              <div className="text-xs text-gray-300">2nd (30%)</div>
            </div>
            <div className="text-center">
              <div className="text-amber-600 font-bold text-lg">
                {formatCurrency(prizePool.distribution.third)}
              </div>
              <div className="text-xs text-gray-300">3rd (10%)</div>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center">10% platform fee deducted before distribution</div>
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-gray-200">Players</span>
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-400">
            {prizePool.participants} joined
          </Badge>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-300 mb-1">
            <span>Battle Activity</span>
            <span>{prizePool.participants} players</span>
          </div>
          <Progress 
            value={participationRate} 
            className="h-2 bg-gray-700"
          />
        </div>

        {/* Countdown Timer */}
        {timeRemaining > 0 && (
          <div className="bg-orange-500/20 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Clock className="h-4 w-4 text-orange-300" />
              <span className="text-sm text-orange-200">Next Battle Starts In</span>
            </div>
            <div className="text-2xl font-bold text-orange-300">
              {formatTime(timeRemaining)}
            </div>
          </div>
        )}

        {/* Join Button */}
        <Button
          onClick={onJoinGame}
          disabled={!canJoinPrizePool || isLoading || timeRemaining > 0}
          className={`w-full h-12 text-lg font-bold transition-all duration-200 ${
            canJoinPrizePool && timeRemaining === 0
              ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-lg hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-600 cursor-not-allowed'
          }`}
        >
          {!canJoinPrizePool ? (
            <span className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Prize Pool Unavailable</span>
            </span>
          ) : isLoading ? (
            <span className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Joining Battle...</span>
            </span>
          ) : timeRemaining > 0 ? (
            <span className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Waiting for Next Battle</span>
            </span>
          ) : isTrialPlayer ? (
            <span className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Join Battle (Free Trial)</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Join Battle ({formatCurrency(prizePool.entryFee)})</span>
            </span>
          )}
        </Button>

        {/* Trial Player Info */}
        {isTrialPlayer && (
          <div className="text-center text-xs text-green-300 pt-2 border-t border-gray-700">
            <div className="flex items-center justify-center space-x-1">
              <Trophy className="w-3 h-3" />
              <span>Equal opportunity - compete with paid players!</span>
            </div>
          </div>
        )}

        {/* Contract Info */}
        <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-700">
          <div>Smart Contract: {prizePool.contractAddress.slice(0, 10)}...{prizePool.contractAddress.slice(-6)}</div>
          <div className="mt-1">Instant payouts • Tamper-proof results</div>
        </div>
      </CardContent>
    </Card>
  );
}