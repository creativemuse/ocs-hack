'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GuestSessionManager } from '@/lib/utils/guestSessionManager';
import { Trophy, Star, Target, Clock, Users, Crown, Download, Trash2 } from 'lucide-react';

interface GuestProfileProps {
  onConnectWallet: () => void;
  onBackToGame: () => void;
  className?: string;
}

export default function GuestProfile({ onConnectWallet, onBackToGame, className = '' }: GuestProfileProps) {
  const [showAchievements, setShowAchievements] = useState(false);
  
  const playerStats = GuestSessionManager.getPlayerStats();
  const achievements = GuestSessionManager.getAchievements();
  
  if (!playerStats) {
    return (
      <div className={`text-center text-white ${className}`}>
        <p>No guest profile found</p>
        <Button onClick={onBackToGame} className="mt-4">
          Back to Game
        </Button>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const achievementProgress = (unlockedAchievements.length / achievements.length) * 100;

  const handleExportData = () => {
    const data = GuestSessionManager.exportGuestData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beatme-guest-data-${playerStats.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all your guest data? This cannot be undone.')) {
      GuestSessionManager.clearGuestData();
      onBackToGame();
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Player Stats */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Crown className="h-5 w-5 text-yellow-400" />
            {playerStats.name}'s Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{playerStats.gamesPlayed}</div>
              <div className="text-xs text-gray-400">Games Played</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{playerStats.bestScore}</div>
              <div className="text-xs text-gray-400">Best Score</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{playerStats.averageScore}</div>
              <div className="text-xs text-gray-400">Avg Score</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{playerStats.achievements}</div>
              <div className="text-xs text-gray-400">Achievements</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Achievement Progress</span>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                {unlockedAchievements.length} / {achievements.length}
              </Badge>
            </div>
            <Progress 
              value={achievementProgress} 
              className="h-2 bg-gray-700/50"
              indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Trophy className="h-5 w-5 text-green-400" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  achievement.unlockedAt 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-gray-500/10 border-gray-500/30 opacity-50'
                }`}
              >
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-white">{achievement.name}</h4>
                    {achievement.unlockedAt && (
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{achievement.description}</p>
                  {achievement.unlockedAt && (
                    <p className="text-xs text-green-400 mt-1">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={onConnectWallet}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Connect Wallet & Claim Rewards
          </Button>
          
          <Button
            onClick={handleExportData}
            variant="outline"
            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Download className="h-4 w-4 mr-2" />
            Export My Data
          </Button>
          
          <Button
            onClick={handleClearData}
            variant="outline"
            className="w-full bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </Button>
          
          <Button
            onClick={onBackToGame}
            variant="outline"
            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Back to Game
          </Button>
          
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
