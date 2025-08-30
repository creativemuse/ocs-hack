'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, Clock, Target } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/game';

interface LiveRankingsProps {
  entries: LeaderboardEntry[];
  currentPlayerAddress?: string;
  refreshInterval?: number;
  className?: string;
}

export default function LiveRankings({
  entries,
  currentPlayerAddress,
  refreshInterval = 5000,
  className = '',
}: LiveRankingsProps) {
  const [displayEntries, setDisplayEntries] = useState<LeaderboardEntry[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Sort entries by total score in descending order and take top 10
    const sortedEntries = [...entries]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1 // Reassign ranks based on sorted position
      }));
    
    setDisplayEntries(sortedEntries);
  }, [entries]);

  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      setIsUpdating(true);
      // Simulate real-time updates - in production this would fetch from server
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
            {rank}
          </div>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEarnings = (earnings: number): string => {
    return earnings > 0 ? `$${earnings.toFixed(2)}` : '$0.00';
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card className={`shadow-lg ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <span>Top 10 Leaderboard</span>
          </div>
          {isUpdating && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Updating...</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {displayEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No players yet</p>
            <p className="text-sm">Be the first to play and claim the top spot!</p>
          </div>
        ) : (
          displayEntries.map((entry) => {
            const isCurrentPlayer = entry.playerAddress === currentPlayerAddress;
            
            return (
              <div
                key={entry.playerAddress}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${getRankStyle(entry.rank)} ${
                  isCurrentPlayer ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Player Info */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                            {entry.playerName?.slice(0, 2).toUpperCase() || 
                             entry.playerAddress.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {entry.playerName || formatAddress(entry.playerAddress)}
                            {isCurrentPlayer && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>{entry.gamesPlayed} games played</span>
                            {/* Show player type indicator */}
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                !entry.isTrialPlayer
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {!entry.isTrialPlayer ? '💰 Paid' : '🎮 Trial'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-800">
                      {entry.totalScore.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div className="flex items-center justify-end space-x-1">
                        <Target className="h-3 w-3" />
                        <span>Avg: {entry.averageScore}</span>
                      </div>
                      <div className="flex items-center justify-end space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(entry.lastPlayed)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings (if any) */}
                {entry.totalEarnings > 0 && (
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Earnings:</span>
                    <Badge className="bg-green-100 text-green-800">
                      {formatEarnings(entry.totalEarnings)}
                    </Badge>
                  </div>
                )}

                {/* Performance Indicators */}
                <div className="mt-3 flex space-x-2">
                  {entry.rank <= 3 && (
                    <Badge variant="outline" className="text-xs">
                      🏆 Top 3
                    </Badge>
                  )}
                  {entry.averageScore > 800 && (
                    <Badge variant="outline" className="text-xs">
                      🎯 High Performer
                    </Badge>
                  )}
                  {entry.gamesPlayed >= 10 && (
                    <Badge variant="outline" className="text-xs">
                      🔥 Active Player
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}