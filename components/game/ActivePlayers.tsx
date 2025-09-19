'use client';

import { useState } from 'react';
import { Avatar } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { useActivePlayers, type ActivePlayer } from '@/hooks/useActivePlayers';
import { useSocialShare } from '@/hooks/useSocialShare';
import { Share2, Users, Trophy } from 'lucide-react';

interface ActivePlayersProps {
  className?: string;
  maxPlayers?: number;
  showTooltips?: boolean;
  showSocialFeatures?: boolean;
  onPlayerClick?: (player: ActivePlayer) => void;
}

export default function ActivePlayers({ 
  className = '', 
  maxPlayers = 16, 
  showTooltips = true,
  showSocialFeatures = true,
  onPlayerClick
}: ActivePlayersProps) {
  const { players, isLoading, error } = useActivePlayers({ maxPlayers });
  const [hoveredPlayer, setHoveredPlayer] = useState<ActivePlayer | null>(null);
  const { sharePlayerActivity } = useSocialShare();

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

  const handlePlayerClick = (player: ActivePlayer) => {
    if (onPlayerClick) {
      onPlayerClick(player);
    }
  };

  const handleSharePlayerActivity = (player: ActivePlayer) => {
    sharePlayerActivity('answered-question', player.username, {
      score: player.totalScore,
      questionNumber: 1, // This would come from game state in a real implementation
      totalQuestions: 30
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center space-x-1 ${className}`}>
        {Array.from({ length: Math.min(8, maxPlayers) }, (_, i) => (
          <div
            key={i}
            className="w-5 h-5 bg-gray-600 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    );
  }

  if (error && players.length === 0) {
    return (
      <div className={`flex items-center justify-center text-gray-400 text-xs ${className}`}>
        <span>Players offline</span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-start space-x-1 ${className}`}>
      {players.map((player, index) => (
        <div
          key={player.address}
          className="relative group"
          style={{ 
            marginRight: index < players.length - 1 ? '-8px' : '0',
            zIndex: players.length - index // Stack avatars with higher index on top
          }}
          onMouseEnter={() => showTooltips && setHoveredPlayer(player)}
          onMouseLeave={() => showTooltips && setHoveredPlayer(null)}
        >
          <div
            className="relative"
            onClick={() => handlePlayerClick(player)}
          >
            <Avatar
              address={player.isWalletUser ? (player.address as `0x${string}`) : undefined}
              chain={base}
              className="w-5 h-5 border-2 border-black rounded-full shadow-sm hover:scale-110 transition-transform duration-200 cursor-pointer"
              defaultComponent={
                <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {player.username.slice(0, 2).toUpperCase()}
                </div>
              }
            />
            
          </div>
          
          {/* Enhanced Tooltip with Social Features */}
          {showTooltips && hoveredPlayer?.address === player.address && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 min-w-[200px]">
              <div className="font-semibold flex items-center space-x-2">
                <span>{player.username}</span>
                {showSocialFeatures && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSharePlayerActivity(player);
                    }}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Share player activity"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-gray-300">
                {player.isWalletUser ? formatAddress(player.address) : 'Anonymous Player'}
              </div>
              <div className="text-green-400 flex items-center space-x-1">
                <Trophy className="w-3 h-3" />
                <span>{player.totalScore} USDC</span>
              </div>
              <div className="text-gray-400 flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{player.gamesPlayed} games</span>
              </div>
              <div className="text-gray-400">{formatLastActive(player.lastActive)}</div>
              
              {/* Social graph connection indicator */}
              
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
