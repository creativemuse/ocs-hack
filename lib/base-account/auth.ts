/**
 * Sign-In with Ethereum (SIWE) authentication for Base Account
 */

import { verifyMessage } from 'viem';
import { getBaseAccountProvider } from '@/lib/base-account/sdk';
import { base } from 'viem/chains';

export const generateNonce = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export const signInWithBase = async (
  signingAddress?: string,
): Promise<{
  address: string;
  signature: string;
  message: string;
}> => {
  const provider = getBaseAccountProvider();
  const nonce = generateNonce();
  const domain = window.location.host;
  const uri = window.location.origin;
  const chainId = base.id;

  let address = signingAddress?.trim().toLowerCase();

  if (!address) {
    const accounts = (await provider.request({
      method: 'eth_accounts',
      params: [],
    })) as string[];

    if (!accounts.length) {
      throw new Error('No account connected');
    }

    // Prefer sub-account (last account) when Base returns [universal, sub].
    address =
      accounts.length > 1
        ? accounts[accounts.length - 1]!.toLowerCase()
        : accounts[0]!.toLowerCase();
  }

  const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to the app.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

  const signature = (await provider.request({
    method: 'personal_sign',
    params: [message, address],
  })) as string;

  return { address, signature, message };
};

export const verifySignature = async (
  message: string,
  signature: string,
  address: string
): Promise<boolean> => {
  try {
    if (!message || !signature || !address) {
      return false;
    }

    return verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

export const storeAuthState = (authData: {
  address: string;
  signature: string;
  message: string;
}): void => {
  localStorage.setItem(
    'base_account_auth',
    JSON.stringify({
      ...authData,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    })
  );
};

export const getAuthState = (): {
  address: string;
  signature: string;
  message: string;
  timestamp: number;
  expiresAt: number;
} | null => {
  try {
    const stored = localStorage.getItem('base_account_auth');
    if (!stored) {
      return null;
    }

    const authData = JSON.parse(stored);
    if (Date.now() > authData.expiresAt) {
      localStorage.removeItem('base_account_auth');
      return null;
    }

    return authData;
  } catch (error) {
    console.error('Error getting auth state:', error);
    return null;
  }
};

export const clearAuthState = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('base_account_auth');
};

const MANUAL_DISCONNECT_KEY = 'base_account_manual_disconnect';

export const setManualDisconnect = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(MANUAL_DISCONNECT_KEY, '1');
};

export const clearManualDisconnect = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(MANUAL_DISCONNECT_KEY);
};

export const isManualDisconnect = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(MANUAL_DISCONNECT_KEY) === '1';
};

export const isAuthenticated = (): boolean => {
  return getAuthState() !== null;
};

export const getAuthenticatedAddress = (): string | null => {
  return getAuthState()?.address || null;
};
