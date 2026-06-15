'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Trophy, Music, Users } from 'lucide-react';
import { buildShareUrl, type ShareAchievementType } from '@/lib/social/buildShareUrl';

interface ComposeCastButtonProps {
  achievementType: ShareAchievementType;
  score?: number;
  round?: number;
  totalRounds?: number;
  playerCount?: number;
  rank?: number;
  className?: string;
  onShare?: () => void;
}

export default function ComposeCastButton({
  achievementType,
  score = 0,
  round = 1,
  totalRounds = 3,
  playerCount = 0,
  rank,
  className = '',
  onShare,
}: ComposeCastButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const getShareText = () => {
    const baseText = '🎵 Just played BEAT ME - the ultimate music trivia game!';

    switch (achievementType) {
      case 'high-score':
        return `${baseText} 🏆 Scored ${score} points and hit #1 on the weekly board! Can you beat me?`;
      case 'game-complete':
        return `${baseText} 🎉 Completed all ${totalRounds} rounds with ${score} points! Ready for the challenge?`;
      case 'round-win':
        return `${baseText} 🥇 Won Round ${round} with ${score} points! Think you can do better?`;
      case 'perfect-round':
        return `${baseText} ⭐ Perfect Round ${round}! Got every question right for ${score} points!`;
      default:
        return `${baseText} Scored ${score} points! Can you beat my score?`;
    }
  };

  const getShareIcon = () => {
    switch (achievementType) {
      case 'high-score':
        return <Trophy className="w-4 h-4" />;
      case 'game-complete':
        return <Music className="w-4 h-4" />;
      case 'round-win':
        return <Users className="w-4 h-4" />;
      case 'perfect-round':
        return <Trophy className="w-4 h-4" />;
      default:
        return <Share2 className="w-4 h-4" />;
    }
  };

  const handleCompose = async () => {
    try {
      setIsSharing(true);

      const shareUrl = buildShareUrl({
        score,
        type: achievementType,
        rank,
      });
      const shareText = getShareText();

      if (navigator.share) {
        await navigator.share({
          title: 'BEAT ME - Music Trivia Game',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      }

      onShare?.();
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const getButtonText = () => {
    switch (achievementType) {
      case 'high-score':
        return 'Share High Score';
      case 'game-complete':
        return 'Share Score';
      case 'round-win':
        return 'Share Round Win';
      case 'perfect-round':
        return 'Share Perfect Round';
      default:
        return 'Share Achievement';
    }
  };

  return (
    <Button
      onClick={handleCompose}
      disabled={isSharing}
      className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all duration-200 ${className}`}
    >
      {isSharing ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Sharing...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {getShareIcon()}
          <span>{getButtonText()}</span>
        </div>
      )}
    </Button>
  );
}
