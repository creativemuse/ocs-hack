/**
 * Utility functions for generating Coinbase Pay funding URLs with session tokens
 */

export interface FundingUrlParams {
  walletAddress: string;
  sessionToken: string;
  appId?: string;
  chains?: string[];
}

/**
 * Generates a Coinbase Pay funding URL with session token
 * @param params - The parameters for generating the funding URL
 * @returns The complete funding URL with session token
 */
export function generateFundingUrl({
  walletAddress,
  sessionToken,
  appId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '5b09d242-5390-4db3-866f-bfc2ce575821',
  chains = ['base']
}: FundingUrlParams): string {
  const baseUrl = 'https://pay.coinbase.com/landing';
  
  // Create the addresses object in the format expected by Coinbase Pay
  const addresses = {
    [walletAddress]: chains
  };
  
  const params = new URLSearchParams({
    addresses: JSON.stringify(addresses),
    appId: appId,
    sdkVersion: 'onchainkit@1.0.2:WalletDropdownFundLink',
    sessionToken: sessionToken
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
