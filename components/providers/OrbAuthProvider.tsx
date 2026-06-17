'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getOrbLogin, enrichSessionWithAccount, sessionFromQrResult } from '@/lib/orb/client';
import {
  ORB_SESSION_STORAGE_KEY,
  type LensProfile,
  type OrbSession,
} from '@/lib/orb/types';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { signInWithBase } from '@/lib/base-account/auth';

type OrbAuthContextValue = {
  session: OrbSession | null;
  linkedProfile: LensProfile | null;
  isConnecting: boolean;
  isLinking: boolean;
  error: string | null;
  connectWithQr: (onInit?: (payload: { qrCode: string; deepLink?: string }) => void) => Promise<void>;
  linkToWallet: () => Promise<LensProfile | null>;
  disconnect: () => void;
  clearError: () => void;
};

const OrbAuthContext = createContext<OrbAuthContextValue | null>(null);

const formatOrbConnectError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return 'Could not start Orb sign-in. Check your connection and try again.';
  }

  const message = err.message.toLowerCase();

  if (
    message.includes('qr init request failed') ||
    message.includes('qr poll request failed')
  ) {
    return 'Could not start Orb sign-in. Check your connection and try again.';
  }

  if (message.includes('timed out') || message.includes('timeout')) {
    return 'Orb sign-in timed out. Please try again.';
  }

  if (message.includes('cancelled')) {
    return 'Orb sign-in was cancelled.';
  }

  return err.message;
};

const formatOrbLinkError = (
  status: number,
  error?: string,
  code?: string,
): string => {
  if (code === 'lens_verify_failed' || status === 401) {
    return error ?? 'Invalid Orb session — scan QR again';
  }
  if (status === 503 || code === 'stdb_token_missing' || code === 'stdb_unavailable') {
    return error ?? 'Profile linking is temporarily unavailable';
  }
  if (status === 409) {
    return error ?? 'This Lens handle is already linked to another wallet';
  }
  return error ?? 'Failed to link Orb profile';
};

const loadStoredSession = (): OrbSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(ORB_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as OrbSession;
  } catch {
    return null;
  }
};

const loadStoredProfile = (): LensProfile | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(`${ORB_SESSION_STORAGE_KEY}_profile`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LensProfile;
  } catch {
    return null;
  }
};

export const OrbAuthProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected } = useBaseAccount();
  const [session, setSession] = useState<OrbSession | null>(null);
  const [linkedProfile, setLinkedProfile] = useState<LensProfile | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(loadStoredSession());
    setLinkedProfile(loadStoredProfile());
  }, []);

  const persistSession = useCallback((next: OrbSession | null) => {
    setSession(next);
    if (typeof window === 'undefined') {
      return;
    }
    if (next) {
      localStorage.setItem(ORB_SESSION_STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(ORB_SESSION_STORAGE_KEY);
    }
  }, []);

  const persistProfile = useCallback((profile: LensProfile | null) => {
    setLinkedProfile(profile);
    if (typeof window === 'undefined') {
      return;
    }
    if (profile) {
      localStorage.setItem(`${ORB_SESSION_STORAGE_KEY}_profile`, JSON.stringify(profile));
    } else {
      localStorage.removeItem(`${ORB_SESSION_STORAGE_KEY}_profile`);
    }
  }, []);

  const connectWithQr = useCallback(
    async (onInit?: (payload: { qrCode: string; deepLink?: string }) => void) => {
      setIsConnecting(true);
      setError(null);
      try {
        const orb = getOrbLogin();
        const result = await orb.connectWithQr({
          onInit: (payload) => {
            onInit?.({
              qrCode: payload.qrCode,
              deepLink: payload.deepLink,
            });
          },
        });
        const nextSession = enrichSessionWithAccount(sessionFromQrResult(result));
        persistSession(nextSession);
      } catch (err) {
        setError(formatOrbConnectError(err));
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [persistSession],
  );

  const linkToWallet = useCallback(async (): Promise<LensProfile | null> => {
    if (!session?.accessToken) {
      setError('Connect Orb first');
      return null;
    }
    if (!isConnected || !address) {
      setError('Connect Base Account first');
      return null;
    }

    setIsLinking(true);
    setError(null);
    try {
      const { message, signature } = await signInWithBase(address);
      const response = await fetch('/api/auth/orb/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: session.accessToken,
          walletAddress: address,
          message,
          signature,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        code?: string;
        profile?: LensProfile & { displayName?: string };
      };

      if (!response.ok) {
        throw new Error(formatOrbLinkError(response.status, data.error, data.code));
      }

      const profile: LensProfile = {
        lensAccountId: data.profile!.lensAccountId,
        handle: data.profile!.handle,
        displayName: data.profile!.displayName,
        avatarUrl: data.profile!.avatarUrl,
      };
      persistProfile(profile);
      return profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link Orb profile');
      return null;
    } finally {
      setIsLinking(false);
    }
  }, [address, isConnected, persistProfile, session?.accessToken]);

  const disconnect = useCallback(() => {
    persistSession(null);
    persistProfile(null);
    setError(null);
  }, [persistProfile, persistSession]);

  const value = useMemo<OrbAuthContextValue>(
    () => ({
      session,
      linkedProfile,
      isConnecting,
      isLinking,
      error,
      connectWithQr,
      linkToWallet,
      disconnect,
      clearError: () => setError(null),
    }),
    [
      session,
      linkedProfile,
      isConnecting,
      isLinking,
      error,
      connectWithQr,
      linkToWallet,
      disconnect,
    ],
  );

  return (
    <OrbAuthContext.Provider value={value}>{children}</OrbAuthContext.Provider>
  );
};

export const useOrbAuth = (): OrbAuthContextValue => {
  const ctx = useContext(OrbAuthContext);
  if (!ctx) {
    throw new Error('useOrbAuth must be used within OrbAuthProvider');
  }
  return ctx;
};
