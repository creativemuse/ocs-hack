import { useState, useCallback } from 'react';

export interface ShareData {
  title: string;
  text: string;
  url?: string;
  hashtags?: string[];
}

export interface SocialShareOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useSocialShare = () => {
  const [isSharing, setIsSharing] = useState(false);

  const share = useCallback(async (
    data: ShareData,
    options: SocialShareOptions = {}
  ) => {
    try {
      setIsSharing(true);
      
      // Try Web Share API first (mobile-friendly)
      if (navigator.share) {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url || window.location.origin
        });
        options.onSuccess?.();
        return;
      }
      
      // Fallback: copy to clipboard
      const shareText = data.hashtags 
        ? `${data.text}\n\n${data.hashtags.map(tag => `#${tag}`).join(' ')}`
        : data.text;
        
      await navigator.clipboard.writeText(shareText);
      
      // Show success feedback (you could integrate with a toast system here)
      console.log('Share text copied to clipboard');
      options.onSuccess?.();
      
    } catch (error) {
      console.error('Error sharing:', error);
      options.onError?.(error instanceof Error ? error : new Error('Share failed'));
    } finally {
      setIsSharing(false);
    }
  }, []);

  const shareGameAchievement = useCallback((
    achievementType: 'high-score' | 'game-complete' | 'round-win' | 'perfect-round',
    score: number,
    additionalData: {
      round?: number;
      totalRounds?: number;
      playerCount?: number;
      playerName?: string;
    } = {},
    options: SocialShareOptions = {}
  ) => {
    const { round = 1, totalRounds = 3, playerCount = 0, playerName } = additionalData;
    
    const baseText = '🎵 Just played BEAT ME - the ultimate music trivia game!';
    let shareText = '';
    let title = 'BEAT ME - Music Trivia Game';
    
    switch (achievementType) {
      case 'high-score':
        shareText = `${baseText} 🏆 Scored ${score} USDC and set a new high score! Can you beat me?`;
        title = 'New High Score on BEAT ME!';
        break;
      case 'game-complete':
        shareText = `${baseText} 🎉 Completed all ${totalRounds} rounds with ${score} USDC total! Ready for the challenge?`;
        title = 'Game Complete on BEAT ME!';
        break;
      case 'round-win':
        shareText = `${baseText} 🥇 Won Round ${round} with ${score} USDC! Think you can do better?`;
        title = `Round ${round} Victory on BEAT ME!`;
        break;
      case 'perfect-round':
        shareText = `${baseText} ⭐ Perfect Round ${round}! Got every question right for ${score} USDC!`;
        title = `Perfect Round ${round} on BEAT ME!`;
        break;
      default:
        shareText = `${baseText} Scored ${score} USDC! Can you beat my score?`;
    }
    
    if (playerName) {
      shareText = shareText.replace('Just played', `${playerName} just played`);
    }
    
    return share({
      title,
      text: shareText,
      url: window.location.origin,
      hashtags: ['BeatMe', 'MusicTrivia', 'Web3Gaming', 'Base']
    }, options);
  }, [share]);

  const sharePlayerActivity = useCallback((
    activityType: 'joined-game' | 'left-game' | 'answered-question',
    playerName: string,
    additionalData: {
      score?: number;
      questionNumber?: number;
      totalQuestions?: number;
    } = {},
    options: SocialShareOptions = {}
  ) => {
    const { score = 0, questionNumber = 1, totalQuestions = 30 } = additionalData;
    
    let shareText = '';
    let title = 'BEAT ME Player Activity';
    
    switch (activityType) {
      case 'joined-game':
        shareText = `🎵 ${playerName} just joined BEAT ME! The music trivia battle is heating up! 🎶`;
        title = `${playerName} Joined BEAT ME!`;
        break;
      case 'left-game':
        shareText = `🎵 ${playerName} finished their BEAT ME session with ${score}! Great game! 🎶`;
        title = `${playerName} Finished BEAT ME!`;
        break;
      case 'answered-question':
        shareText = `🎵 ${playerName} is on question ${questionNumber}/${totalQuestions} in BEAT ME! Current score: ${score} 🎶`;
        title = `${playerName} Playing BEAT ME!`;
        break;
    }
    
    return share({
      title,
      text: shareText,
      url: window.location.origin,
      hashtags: ['BeatMe', 'MusicTrivia', 'Web3Gaming', 'Base']
    }, options);
  }, [share]);

  return {
    share,
    shareGameAchievement,
    sharePlayerActivity,
    isSharing
  };
};
