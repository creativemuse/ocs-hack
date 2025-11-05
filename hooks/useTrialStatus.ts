'use client';

import { useState, useEffect, useMemo } from 'react';
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
  // Check if trial bypass is enabled via environment variable
  const bypassTrial = process.env.NEXT_PUBLIC_BYPASS_TRIAL === 'true';
  
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    gamesPlayed: 0,
    gamesRemaining: bypassTrial ? 0 : 1, // No trial games if bypassed, 1 if trial enabled
    isTrialActive: !bypassTrial, // Trial active only if not bypassed
    requiresWallet: bypassTrial, // Require wallet only if bypassed
    canJoinPrizePool: true, // Both trial and paid players can join prize pools
    playerType: bypassTrial ? 'paid' : 'trial' // Set player type based on bypass setting
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load entryToken from localStorage if not provided
  const [persistedToken, setPersistedToken] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // If entryToken is not provided as prop, try to load from localStorage
    if (!entryToken) {
      const savedToken = localStorage.getItem('beatme_entry_token');
      if (savedToken) {
        // Verify token is not expired before using it
        try {
          const payload = JSON.parse(atob(savedToken.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp > now) {
            setPersistedToken(savedToken);
          } else {
            // Token expired, remove it
            localStorage.removeItem('beatme_entry_token');
            setPersistedToken(null);
          }
        } catch (e) {
          // Invalid token format, remove it
          localStorage.removeItem('beatme_entry_token');
          setPersistedToken(null);
        }
      } else {
        setPersistedToken(null);
      }
    } else {
      setPersistedToken(null); // Clear persisted token if we have a fresh one
    }
  }, [entryToken]);

  // Use provided token or persisted token - ensure it's never undefined
  const effectiveToken = useMemo(() => {
    return entryToken || persistedToken || null;
  }, [entryToken, persistedToken]);

  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        if (bypassTrial) {
          // BYPASS TRIAL: Always set as paid player
          setTrialStatus({
            gamesPlayed: 0,
            gamesRemaining: 0, // No trial games remaining
            isTrialActive: false, // Trial is not active - force paid mode
            requiresWallet: true, // Always require wallet for paid mode
            canJoinPrizePool: true, // Paid players can join prize pools
            playerType: 'paid' // Set as paid player
          });
        } else {
          // NORMAL TRIAL MODE: Check actual trial status
          // Prioritize wallet address over entry token when both are available
          if (walletAddress) {
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
          } else if (effectiveToken) {
            // Check trial status using JWT token
            const response = await fetch(`/api/trial-status?token=${encodeURIComponent(effectiveToken)}`);
            if (response.ok) {
              const data = await response.json();
              const gamesRemaining = data.trialGamesRemaining || Math.max(0, 1 - (data.gamesPlayed || 0));
              const isTrialActive = gamesRemaining > 0;
              setTrialStatus({
                gamesPlayed: data.gamesPlayed || 0,
                gamesRemaining,
                isTrialActive,
                requiresWallet: !isTrialActive,
                canJoinPrizePool: true,
                playerType: data.playerType || 'trial'
              });
              
              // Sync local state with server data if available
              if (data.gamesPlayed !== undefined) {
                SessionManager.syncWithServerData(data.gamesPlayed);
              }
            } else {
              // Token might be expired or invalid, clear it and fallback to session check
              if (typeof window !== 'undefined' && effectiveToken === persistedToken) {
                localStorage.removeItem('beatme_entry_token');
                setPersistedToken(null);
              }
              // Fall through to session ID check
              throw new Error('Token validation failed');
            }
          } else {
            // Check anonymous session trial status
            const sessionId = SessionManager.getSessionId();
            const response = await fetch(`/api/trial-status?session=${sessionId}`);
            if (response.ok) {
              const data = await response.json();
              const gamesRemaining = data.trialGamesRemaining || Math.max(0, 1 - (data.gamesPlayed || 0));
              const isTrialActive = gamesRemaining > 0;
              setTrialStatus({
                gamesPlayed: data.gamesPlayed || 0,
                gamesRemaining,
                isTrialActive,
                requiresWallet: !isTrialActive, // Require wallet when trial is exhausted
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
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
        // Fallback based on bypass setting
        if (bypassTrial) {
          // Fallback to paid player status
          setTrialStatus({
            gamesPlayed: 0,
            gamesRemaining: 0,
            isTrialActive: false,
            requiresWallet: true,
            canJoinPrizePool: true,
            playerType: 'paid'
          });
        } else {
          // Fallback to trial status
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
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkTrialStatus();
  }, [walletAddress, bypassTrial, effectiveToken]);

  const incrementTrialGame = async () => {
    try {
      if (bypassTrial) {
        // BYPASS TRIAL: For paid players, we don't need to track trial games
        // Just update the games played count for statistics
        if (walletAddress) {
          // Update wallet player games in SpaceTimeDB (as paid player)
          const response = await fetch('/api/trial-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress })
          });
          
          if (!response.ok) {
            console.warn('Failed to update player status in SpaceTimeDB, continuing with local update');
          }
        } else {
          // Update anonymous session in SpaceTimeDB (as paid player)
          const sessionId = SessionManager.getSessionId();
          const response = await fetch('/api/trial-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          
          if (!response.ok) {
            console.warn('Failed to update player status in SpaceTimeDB, continuing with local update');
          }
        }
        
        // Update local state for paid players (no trial restrictions)
        setTrialStatus(prev => {
          const updatedGamesPlayed = prev.gamesPlayed + 1;
          return {
            ...prev,
            gamesPlayed: updatedGamesPlayed,
            gamesRemaining: 0, // No trial games remaining for paid players
            isTrialActive: false, // Always false for paid players
            requiresWallet: true, // Always require wallet for paid players
            canJoinPrizePool: true, // Paid players can always join prize pools
            playerType: 'paid' // Maintain paid player status
          };
        });
      } else {
        // NORMAL TRIAL MODE: Track trial games properly
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
        
        // Update local state for trial players
        setTrialStatus(prev => {
          const updatedGamesPlayed = prev.gamesPlayed + 1;
          const updatedGamesRemaining = Math.max(0, prev.gamesRemaining - 1);
          const isTrialActive = updatedGamesRemaining > 0;
          return {
            ...prev,
            gamesPlayed: updatedGamesPlayed,
            gamesRemaining: updatedGamesRemaining,
            // Trial is active only if there are remaining free plays
            isTrialActive,
            requiresWallet: !isTrialActive, // Require wallet when trial is exhausted
            canJoinPrizePool: true // Always allow prize pool participation
          };
        });
      }
    } catch (error) {
      console.error('Error updating player status:', error);
      // Still update local state even if database update fails
      setTrialStatus(prev => {
        const updatedGamesPlayed = prev.gamesPlayed + 1;
        if (bypassTrial) {
          // Paid player fallback
          return {
            ...prev,
            gamesPlayed: updatedGamesPlayed,
            gamesRemaining: 0,
            isTrialActive: false,
            requiresWallet: true,
            canJoinPrizePool: true,
            playerType: 'paid'
          };
        } else {
          // Trial player fallback
          const updatedGamesRemaining = Math.max(0, prev.gamesRemaining - 1);
          const isTrialActive = updatedGamesRemaining > 0;
          return {
            ...prev,
            gamesPlayed: updatedGamesPlayed,
            gamesRemaining: updatedGamesRemaining,
            isTrialActive,
            requiresWallet: !isTrialActive, // Require wallet when trial is exhausted
            canJoinPrizePool: true
          };
        }
      });
    }
  };

  return { trialStatus, isLoading, incrementTrialGame };
};
