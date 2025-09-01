'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { Gamepad2, Crown, Coins } from 'lucide-react';

interface TrialStatusDisplayProps {
  walletAddress?: string;
  className?: string;
}

export default function TrialStatusDisplay({ walletAddress, className = '' }: TrialStatusDisplayProps) {
  const { trialStatus, isLoading } = useTrialStatus(walletAddress);

  if (isLoading) {
    return (
      <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-purple-500/20 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-blue-500/20 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isTrialActive = trialStatus.isTrialActive;
  const gamesPlayed = trialStatus.gamesPlayed;
  const gamesRemaining = trialStatus.gamesRemaining;
  const totalTrialGames = 1;
  const progressPercentage = (gamesPlayed / totalTrialGames) * 100;

  return (
    <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          {isTrialActive ? (
            <>
              <Gamepad2 className="h-5 w-5 text-green-400" />
              Trial Player
            </>
          ) : (
            <>
              <Crown className="h-5 w-5 text-yellow-400" />
              Premium Player
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTrialActive ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Free Plays Remaining</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {gamesRemaining} / {totalTrialGames}
                </Badge>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2 bg-gray-700/50"
                indicatorClassName="bg-gradient-to-r from-green-500 to-emerald-500"
              />
            </div>
            <div className="text-xs text-gray-400 text-center space-y-2">
              <div>After {totalTrialGames} free plays, you'll need to pay 1 USDC per game</div>
              <div className="text-amber-400 font-medium">
                ⚠️ Trial players cannot win prizes from the prize pool
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 text-center">
              You've used all of your free plays.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
