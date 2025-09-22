'use client';

import { useState, useEffect } from 'react';
import { SessionManager } from '@/lib/utils/sessionManager';

interface TrialStatus {
  gamesPlayed: number;
  gamesRemaining: number;
  isTrialActive: boolean;
  requiresWallet: boolean;
  canJoinPrizePool: boolean; // New field to allow trial players in prize pools
  playerType?: 'trial' | 'paid';
}

export const useTrialStatus = (walletAddress?: string, entryToken?: string) => {
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
        // If we have an entry token, use JWT-based checking (preferred)
        if (entryToken) {
          const response = await fetch(`/api/trial-status?token=${encodeURIComponent(entryToken)}`);
          if (response.ok) {
            const data = await response.json();
            setTrialStatus({
              gamesPlayed: data.gamesPlayed || 0,
              gamesRemaining: data.trialGamesRemaining || Math.max(0, 1 - (data.gamesPlayed || 0)),
              isTrialActive: (data.trialGamesRemaining || Math.max(0, 1 - (data.gamesPlayed || 0))) > 0,
              requiresWallet: data.playerType === 'paid',
              canJoinPrizePool: data.playerType === 'paid', // Only paid players can join prize pools
              playerType: data.playerType
            });
          } else {
            console.warn('JWT-based trial status check failed, falling back to legacy method');
          }
        } else if (walletAddress) {
          // Check wallet-connected player trial status
          const response = await fetch(`/api/trial-status?wallet=${walletAddress}`);
          if (response.ok) {
            const data = await response.json();
            setTrialStatus({
              gamesPlayed: data.gamesPlayed || (1 - data.trialGamesRemaining),
              gamesRemaining: data.trialGamesRemaining,
              isTrialActive: data.trialGamesRemaining > 0,
              requiresWallet: false, // Wallet users never require wallet connection
              canJoinPrizePool: true // Wallet users can always join prize pools
            });
          } else {
            // If API fails, fall back to default trial status for wallet users
            setTrialStatus({
              gamesPlayed: 0,
              gamesRemaining: 1,
              isTrialActive: true,
              requiresWallet: false,
              canJoinPrizePool: true
            });
          }
        } else {
          // Check anonymous session trial status
          const sessionId = SessionManager.getSessionId();
          const response = await fetch(`/api/trial-status?session=${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            setTrialStatus({
              gamesPlayed: data.gamesPlayed || 0,
              gamesRemaining: data.trialGamesRemaining || Math.max(0, 1 - (data.gamesPlayed || 0)),
              isTrialActive: (data.trialGamesRemaining || Math.max(0, 1 - (data.gamesPlayed || 0))) > 0,
              requiresWallet: false, // Trial players can still play, just with limited games
              canJoinPrizePool: true // Trial players can always join prize pools
            });
            
            // Sync local state with server data if available
            if (data.gamesPlayed !== undefined) {
              SessionManager.syncWithServerData(data.gamesPlayed);
            }
          } else {
            // Fallback to local storage for anonymous users if API fails
            const gamesPlayed = SessionManager.getTrialGamesPlayed();
            setTrialStatus({
              gamesPlayed,
              gamesRemaining: Math.max(0, 1 - gamesPlayed),
              isTrialActive: gamesPlayed < 1,
              requiresWallet: false, // Trial players can still play
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
        } else {
          // For wallet users, provide default trial status
          setTrialStatus({
            gamesPlayed: 0,
            gamesRemaining: 1,
            isTrialActive: true,
            requiresWallet: false,
            canJoinPrizePool: true
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkTrialStatus();
  }, [walletAddress, entryToken]);

  const incrementTrialGame = async () => {
    try {
      if (walletAddress) {
        // Update wallet player trial games in SpaceTimeDB
        const response = await fetch('/api/trial-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress })
        });
        
        if (!response.ok) {
          console.warn('Failed to update trial status in SpaceTimeDB, continuing with local update');
        }
      } else {
        // Update anonymous session in SpaceTimeDB
        const sessionId = SessionManager.getSessionId();
        SessionManager.incrementTrialGames(); // Update local storage first
        const response = await fetch('/api/trial-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        
        if (!response.ok) {
          console.warn('Failed to update trial status in SpaceTimeDB, continuing with local update');
        }
      }
      
      // Update local state optimistically
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
