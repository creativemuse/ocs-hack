/**
 * Sign-In with Ethereum (SIWE) authentication for Base Account
 * 
 * Implements EIP-4361 standard for secure authentication
 */

import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';

function getProvider() {
  if (typeof window === 'undefined') {
    throw new Error('Base Account SDK is only available in the browser');
  }
  const sdk = createBaseAccountSDK({
    appName: 'BEAT ME',
    appLogoUrl: 'https://base.org/logo.png',
    appChainIds: [base.id],
    subAccounts: {
      creation: 'on-connect',
      defaultAccount: 'sub',
    },
  });
  return sdk.getProvider();
}

/**
 * Generate a unique nonce for SIWE authentication
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Complete Sign-In with Base (SIWE) flow
 */
export async function signInWithBase(): Promise<{
  address: string;
  signature: string;
  message: string;
}> {
  try {
    const provider = getProvider();
    
    // Generate nonce for this session
    const nonce = generateNonce();
    
    // Create SIWE message following EIP-4361
    const domain = window.location.host;
    const uri = window.location.origin;
    const version = '1';
    const chainId = base.id;
    
    const message = `${domain} wants you to sign in with your Ethereum account:
${await getAccountAddress()}

${getSiweMessage(domain, uri, nonce, version, chainId)}

URI: ${uri}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

    // Request signature from user
    const signature = (await provider.request({
      method: 'personal_sign',
      params: [message, await getAccountAddress()]
    })) as string;

    const address = await getAccountAddress();
    
    return {
      address,
      signature,
      message,
    };
  } catch (error) {
    console.error('❌ SIWE authentication failed:', error);
    throw error;
  }
}

/**
 * Get the current account address
 */
async function getAccountAddress(): Promise<string> {
  const provider = getProvider();
  const accounts = (await provider.request({
    method: 'eth_accounts',
    params: []
  })) as string[];
  
  if (!accounts || accounts.length === 0) {
    throw new Error('No account connected');
  }
  
  return accounts[0];
}

/**
 * Create SIWE message content
 */
function getSiweMessage(domain: string, uri: string, nonce: string, version: string, chainId: number): string {
  return `Sign in with Ethereum to the app.

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.

URI: ${uri}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;
}

/**
 * Verify SIWE signature on the server side
 * This would typically be called from an API route
 */
export async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    // In a real implementation, you would use a library like viem or ethers
    // to verify the signature on the server side
    // For now, we'll just validate the format
    
    if (!message || !signature || !address) {
      return false;
    }
    
    // Basic validation - in production, use proper signature verification
    return signature.startsWith('0x') && address.startsWith('0x');
  } catch (error) {
    console.error('❌ Signature verification failed:', error);
    return false;
  }
}

/**
 * Store authentication state
 */
export function storeAuthState(authData: {
  address: string;
  signature: string;
  message: string;
}): void {
  localStorage.setItem('base_account_auth', JSON.stringify({
    ...authData,
    timestamp: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  }));
}

/**
 * Get stored authentication state
 */
export function getAuthState(): {
  address: string;
  signature: string;
  message: string;
  timestamp: number;
  expiresAt: number;
} | null {
  try {
    const stored = localStorage.getItem('base_account_auth');
    if (!stored) return null;
    
    const authData = JSON.parse(stored);
    
    // Check if auth is expired
    if (Date.now() > authData.expiresAt) {
      localStorage.removeItem('base_account_auth');
      return null;
    }
    
    return authData;
  } catch (error) {
    console.error('❌ Error getting auth state:', error);
    return null;
  }
}

/**
 * Clear authentication state
 */
export function clearAuthState(): void {
  localStorage.removeItem('base_account_auth');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const authState = getAuthState();
  return authState !== null;
}

/**
 * Get authenticated address
 */
export function getAuthenticatedAddress(): string | null {
  const authState = getAuthState();
  return authState?.address || null;
}
