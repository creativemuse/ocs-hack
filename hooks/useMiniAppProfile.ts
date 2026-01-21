'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface MiniAppProfile {
  user: MiniAppUser | null;
  isLoading: boolean;
  isInMiniApp: boolean;
  error: Error | null;
}

/**
 * Hook to access Farcaster Mini App user profile data
 * Returns user profile information (displayName, username, pfpUrl) when available
 * Falls back gracefully when not in Mini App context
 */
export function useMiniAppProfile(): MiniAppProfile {
  const [profile, setProfile] = useState<MiniAppProfile>({
    user: null,
    isLoading: true,
    isInMiniApp: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        // Check if we're in a Mini App context
        const inMiniApp = await sdk.isInMiniApp();
        
        if (!inMiniApp) {
          if (isMounted) {
            setProfile({
              user: null,
              isLoading: false,
              isInMiniApp: false,
              error: null,
            });
          }
          return;
        }

        // Get the context which contains user profile data
        const context = await sdk.context;
        
        if (isMounted) {
          setProfile({
            user: context.user ? {
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            } : null,
            isLoading: false,
            isInMiniApp: true,
            error: null,
          });
        }
      } catch (error) {
        console.error('[useMiniAppProfile] Error loading profile:', error);
        if (isMounted) {
          setProfile({
            user: null,
            isLoading: false,
            isInMiniApp: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          });
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return profile;
}
