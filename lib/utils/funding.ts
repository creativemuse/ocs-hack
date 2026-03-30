/**
 * Utility functions for generating Coinbase Pay funding URLs with session tokens
 * and One-Click-Buy URLs
 */

import type { OneClickBuyOptions, OneClickBuyResult } from '@/types/onramp';

export interface FundingUrlParams {
  walletAddress: string;
  sessionToken: string;
  appId?: string;
  chains?: string[];
}

/**
 * Generates a Coinbase Pay One-Click-Buy URL with session token
 * According to Coinbase docs, One-Click-Buy URLs must have:
 * - sessionToken (generated server-side with addresses)
 * - defaultAsset
 * - presetFiatAmount + fiatCurrency OR presetCryptoAmount
 * @param params - The parameters for generating the funding URL
 * @returns The complete One-Click-Buy URL with session token
 */
export function generateFundingUrl({
  walletAddress,
  sessionToken,
  appId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '5b09d242-5390-4db3-866f-bfc2ce575821',
  chains = ['base']
}: FundingUrlParams): string {
  // Use the correct One-Click-Buy URL path
  const baseUrl = 'https://pay.coinbase.com/buy';
  
  // Build query parameters according to Coinbase One-Click-Buy requirements
  // Note: addresses are already in the session token (from server-side API call)
  // They should NOT be passed in the URL query parameters
  const params = new URLSearchParams({
    sessionToken: sessionToken,
    defaultAsset: 'USDC',              // Required: specific asset to buy
    fiatCurrency: 'USD',               // Required when using presetFiatAmount
    presetFiatAmount: '2',            // Amount in USD (includes fees)
    defaultPaymentMethod: 'CARD',      // CARD auto-upgrades to Apple Pay when available
    defaultNetwork: 'base'             // Ensure it uses Base network
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Validates if a session token is properly formatted
 * @param token - The session token to validate
 * @returns True if the token appears to be valid
 */
export function isValidSessionToken(token: string): boolean {
  // Basic validation - session tokens should be non-empty strings
  return typeof token === 'string' && token.length > 0;
}

/**
 * Extracts the wallet address from a Coinbase Pay URL
 * @param url - The Coinbase Pay URL
 * @returns The wallet address if found, null otherwise
 */
export function extractWalletAddressFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const addressesParam = urlObj.searchParams.get('addresses');
    if (addressesParam) {
      const addresses = JSON.parse(addressesParam);
      const walletAddresses = Object.keys(addresses);
      return walletAddresses.length > 0 ? walletAddresses[0] : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a One-Click-Buy URL using the buy quote API
 * @param walletAddress - The destination wallet address
 * @param options - Optional configuration for the buy quote
 * @returns Promise with the onramp URL and quote ID
 */
export async function generateOneClickBuyUrl(
  walletAddress: string,
  options?: OneClickBuyOptions
): Promise<OneClickBuyResult> {
  const defaultOptions: Required<Omit<OneClickBuyOptions, 'subdivision'>> = {
    paymentAmount: '2.00',
    paymentCurrency: 'USD',
    purchaseCurrency: 'USDC',
    purchaseNetwork: 'base',
    paymentMethod: 'CARD',
    country: 'US',
  };

  const params = {
    walletAddress,
    ...defaultOptions,
    ...options,
  };

  const response = await fetch('/api/buy-quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to generate buy quote: ${response.status}`);
  }

  const data = await response.json();

  if (!data.onrampUrl) {
    throw new Error('No onramp URL returned from buy quote API');
  }

  return {
    url: data.onrampUrl,
    quoteId: data.quoteId,
    quote: data,
  };
}

/**
 * Clears browser cache and storage to prevent session token reuse
 * This helps ensure fresh session tokens are used for each payment attempt
 */
export async function clearBrowserCache(): Promise<void> {
  try {
    // Clear browser cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✔ Browser cache cleared');
    }
    
    // Clear any potential session storage
    if (typeof window !== 'undefined') {
      // Clear session storage
      sessionStorage.clear();
      
      // Clear any localStorage items related to Coinbase Pay
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('coinbase') || key.includes('pay') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('✔ Browser storage cleared');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clear browser cache:', error);
  }
}
