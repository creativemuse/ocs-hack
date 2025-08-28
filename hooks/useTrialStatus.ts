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
    gamesRemaining: 3,
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
              gamesPlayed: 3 - data.trialGamesRemaining,
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
              gamesRemaining: Math.max(0, 3 - data.gamesPlayed),
              isTrialActive: data.gamesPlayed < 3,
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
            gamesRemaining: Math.max(0, 3 - gamesPlayed),
            isTrialActive: gamesPlayed < 3,
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

  const incrementTrialGame = () => {
    if (!walletAddress) {
      SessionManager.incrementTrialGames();
    }
    setTrialStatus(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesRemaining: Math.max(0, prev.gamesRemaining - 1),
      isTrialActive: prev.gamesPlayed < 2,
      requiresWallet: false, // Never require wallet connection
      canJoinPrizePool: true // Always allow prize pool participation
    }));
  };

  return { trialStatus, isLoading, incrementTrialGame };
};
