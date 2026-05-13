'use client';

import { useState, useEffect } from 'react';
import { BaseAvatar } from '@/components/identity/BaseAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, Share2, ExternalLink, Sparkles } from 'lucide-react';
import type { ActivePlayer } from '@/hooks/useActivePlayers';
import { useSocialShare } from '@/hooks/useSocialShare';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

interface SocialProfileViewerProps {
  player: ActivePlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialProfileViewer({ 
  player, 
  isOpen, 
  onClose 
}: SocialProfileViewerProps) {
  const { sharePlayerActivity } = useSocialShare();
  const [isSharing, setIsSharing] = useState(false);

  // Fetch real blockchain profile data
  const { profile: blockchainProfile, isLoading: profileLoading } = usePlayerProfile({
    address: player?.address || null,
    enabled: isOpen && !!player
  });

  if (!player) return null;

  // Use blockchain data if available, otherwise fall back to player data
  const displayStats = {
    totalScore: blockchainProfile?.totalEarnings || player.totalScore,
    gamesPlayed: blockchainProfile?.totalGames || player.gamesPlayed,
    perfectRounds: blockchainProfile?.perfectRounds || 0,
    highestPayout: blockchainProfile?.highestPayout || 0,
    isLiveData: !!blockchainProfile
  };

  const formatAddress = (address: string) => {
    if (address.startsWith('anon_')) {
      return address.slice(5, 13) + '...';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatLastActive = (lastActive: string) => {
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffInMinutes = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleShareProfile = async () => {
    setIsSharing(true);
    try {
      await sharePlayerActivity('answered-question', player.username, {
        score: player.totalScore,
        questionNumber: 1,
        totalQuestions: 30
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const getPlayerRank = () => {
    // This would be calculated based on actual leaderboard data
    if (player.totalScore >= 1000) return 'Legend';
    if (player.totalScore >= 500) return 'Expert';
    if (player.totalScore >= 200) return 'Advanced';
    if (player.totalScore >= 100) return 'Intermediate';
    return 'Beginner';
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Legend': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'Expert': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      case 'Advanced': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      case 'Intermediate': return 'bg-gradient-to-r from-green-400 to-green-600';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-center">Player Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Player Avatar and Basic Info */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <BaseAvatar
                address={player.isWalletUser ? (player.address as `0x${string}`) : undefined}
                className="w-20 h-20 border-4 border-gray-700 rounded-full"
                defaultComponent={
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {player.username.slice(0, 2).toUpperCase()}
                  </div>
                }
              />
              <div className="absolute -bottom-2 -right-2">
                <Badge className={`${getRankColor(getPlayerRank())} text-white border-0`}>
                  {getPlayerRank()}
                </Badge>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white">{player.username}</h2>
              <p className="text-gray-400 text-sm">
                {player.isWalletUser ? formatAddress(player.address) : 'Anonymous Player'}
              </p>
            </div>
          </div>

          {/* Live Data Badge */}
          {displayStats.isLiveData && (
            <div className="flex items-center justify-center space-x-2">
              <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Live Blockchain Data
              </Badge>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center relative">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {profileLoading ? (
                  <div className="h-8 w-20 mx-auto bg-gray-700 animate-pulse rounded" />
                ) : (
                  displayStats.totalScore
                )}
              </div>
              <div className="text-gray-400 text-sm">Total USDC</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 text-center relative">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {profileLoading ? (
                  <div className="h-8 w-20 mx-auto bg-gray-700 animate-pulse rounded" />
                ) : (
                  displayStats.gamesPlayed
                )}
              </div>
              <div className="text-gray-400 text-sm">Games Played</div>
            </div>
          </div>

          {/* Additional Stats (only shown with blockchain data) */}
          {displayStats.isLiveData && (displayStats.perfectRounds > 0 || displayStats.highestPayout > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {displayStats.perfectRounds > 0 && (
                <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-4 text-center">
                  <Sparkles className="w-6 h-6 text-purple-300 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{displayStats.perfectRounds}</div>
                  <div className="text-purple-200 text-sm">Perfect Rounds</div>
                </div>
              )}
              
              {displayStats.highestPayout > 0 && (
                <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-4 text-center">
                  <Trophy className="w-6 h-6 text-green-300 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{displayStats.highestPayout}</div>
                  <div className="text-green-200 text-sm">Highest Win</div>
                </div>
              )}
            </div>
          )}

          {/* Activity Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">Last Active</span>
              </div>
              <span className="text-white text-sm">{formatLastActive(player.lastActive)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleShareProfile}
              disabled={isSharing}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isSharing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sharing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4" />
                  <span>Share Profile</span>
                </div>
              )}
            </Button>
            
            {player.isWalletUser && (
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={() => {
                  // In a real implementation, this would open the player's on-chain profile
                  console.log('View on-chain profile for:', player.address);
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
