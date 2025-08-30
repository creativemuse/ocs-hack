'use client';

import { useState, useEffect } from 'react';
import { SessionManager } from '@/lib/utils/sessionManager';

interface TrialStatus {
  gamesPlayed: number;
  gamesRemaining: number;
  isTrialActive: boolean;
  requiresWallet: boolean;
  canJoinPrizePool: boolean; // New field to allow trial players in prize pools
}

export const useTrialStatus = (walletAddress?: string) => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    gamesPlayed: 0,
    gamesRemaining: 1,
    isTrialActive: true,
    requiresWallet: false,
    canJoinPrizePool: true // Trial players can always join prize pools
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        if (walletAddress) {
          // Check wallet-connected player trial status
          const response = await fetch(`/api/trial-status?wallet=${walletAddress}`);
          if (response.ok) {
            const data = await response.json();
            setTrialStatus({
              gamesPlayed: 1 - data.trialGamesRemaining,
              gamesRemaining: data.trialGamesRemaining,
              isTrialActive: data.trialGamesRemaining > 0,
              requiresWallet: false, // Wallet users never require wallet connection
              canJoinPrizePool: true // Wallet users can always join prize pools
            });
          }
        } else {
          // Check anonymous session trial status
          const sessionId = SessionManager.getSessionId();
          const response = await fetch(`/api/trial-status?session=${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            setTrialStatus({
              gamesPlayed: data.gamesPlayed,
              gamesRemaining: Math.max(0, 1 - data.gamesPlayed),
                              isTrialActive: data.gamesPlayed < 1,
              requiresWallet: false, // Trial players can still play, just with limited games
              canJoinPrizePool: true // Trial players can always join prize pools
            });
          }
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
        // Fallback to local storage for anonymous users
        if (!walletAddress) {
          const gamesPlayed = SessionManager.getTrialGamesPlayed();
          setTrialStatus({
            gamesPlayed,
            gamesRemaining: Math.max(0, 1 - gamesPlayed),
                          isTrialActive: gamesPlayed < 1,
            requiresWallet: false, // Trial players can still play
            canJoinPrizePool: true // Trial players can always join prize pools
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkTrialStatus();
  }, [walletAddress]);

  const incrementTrialGame = async () => {
    try {
      if (walletAddress) {
        // Update wallet player trial games in database
        await fetch('/api/trial-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress })
        });
      } else {
        // Update anonymous session
        SessionManager.incrementTrialGames();
        const sessionId = SessionManager.getSessionId();
        await fetch('/api/trial-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
      }
      
      // Update local state
      setTrialStatus(prev => {
        const updatedGamesPlayed = prev.gamesPlayed + 1;
        const updatedGamesRemaining = Math.max(0, prev.gamesRemaining - 1);
        return {
          ...prev,
          gamesPlayed: updatedGamesPlayed,
          gamesRemaining: updatedGamesRemaining,
          // Trial is active only if there are remaining free plays
          isTrialActive: updatedGamesRemaining > 0,
          requiresWallet: false, // Never require wallet connection
          canJoinPrizePool: true // Always allow prize pool participation
        };
      });
    } catch (error) {
      console.error('Error incrementing trial game:', error);
      // Still update local state even if database update fails
      setTrialStatus(prev => {
        const updatedGamesPlayed = prev.gamesPlayed + 1;
        const updatedGamesRemaining = Math.max(0, prev.gamesRemaining - 1);
        return {
          ...prev,
          gamesPlayed: updatedGamesPlayed,
          gamesRemaining: updatedGamesRemaining,
          isTrialActive: updatedGamesRemaining > 0,
          requiresWallet: false,
          canJoinPrizePool: true
        };
      });
    }
  };

  return { trialStatus, isLoading, incrementTrialGame };
};
