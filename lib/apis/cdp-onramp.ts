import crypto from 'crypto';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

// Types for CDP Onramp API
export interface CDPBuyQuoteRequest {
  clientIp: string;
  country: string;
  destinationAddress: string;
  paymentAmount: string;
  paymentCurrency: string;
  paymentMethod?: 'CARD' | 'BANK_TRANSFER' | 'UNSPECIFIED';
  purchaseCurrency: string;
  purchaseNetwork: string;
  subdivision?: string;
}

export interface CDPBuyQuoteResponse {
  onrampUrl?: string;
  quoteId?: string;
  purchaseAmount?: string;
  paymentTotal?: string;
  fees?: {
    networkFee?: string;
    processingFee?: string;
    totalFee?: string;
  };
  exchangeRate?: string;
}

export interface CDPSessionTokenRequest {
  clientIp: string;
  addresses: Array<{
    address: string;
    blockchains: string[];
  }>;
  assets: string[];
  destinationWallets?: Array<{
    address: string;
    assets: string[];
    blockchains: string[];
    supportedNetworks: string[];
  }>;
  requestId?: string;
  component?: string;
  sessionId?: string;
}

export interface CDPSessionTokenResponse {
  token: string;
  expiresAt?: string;
}

// JWT Generation Functions
export async function generateEd25519JWT(apiKeyName: string, privateKey: string): Promise<string> {
  try {
    const token = await generateJwt({
      apiKeyId: apiKeyName,
      apiKeySecret: privateKey,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
      expiresIn: 120 // 2 minutes expiration
    });
    
    return token;
  } catch (error) {
    console.error('Error generating Ed25519 JWT:', error);
    throw new Error(`Ed25519 JWT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateRS256JWT(apiKeyName: string, privateKey: string): string {
  try {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: apiKeyName
    };

    const now = Math.floor(Date.now() / 1000);
    const uri = `POST api.developer.coinbase.com/onramp/v1/token`;
    
    const payload = {
      sub: apiKeyName,
      iss: 'cdp',
      aud: ['cdp_service'],
      nbf: now,
      exp: now + 120, // 2 minutes expiration
      uri: uri
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    // Ensure private key is in proper PEM format
    let formattedPrivateKey = privateKey
      .replace(/\\n/g, '\n')
      .trim();
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`;
    }
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${encodedHeader}.${encodedPayload}`);
    const signature = sign.sign(formattedPrivateKey, 'base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error('Error generating RS256 JWT:', error);
    throw new Error(`RS256 JWT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateHS256JWT(apiKey: string, apiSecret: string): string {
  try {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
      kid: apiKey
    };

    const now = Math.floor(Date.now() / 1000);
    const uri = `POST api.developer.coinbase.com/onramp/v1/token`;
    
    const payload = {
      sub: apiKey,
      iss: 'cdp',
      aud: ['cdp_service'],
      nbf: now,
      exp: now + 120, // 2 minutes expiration
      uri: uri
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error('Error generating HS256 JWT:', error);
    throw new Error(`HS256 JWT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Main JWT generation function with fallback logic
export async function generateCDPJWT(): Promise<string> {
  const cdpApiKeyName = process.env.CDP_API_KEY_NAME;
  const cdpApiPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
  const cdpApiKey = process.env.CDP_API_KEY;
  const cdpApiSecret = process.env.CDP_API_SECRET;

  let jwt: string | undefined;
  let authMethod: string | undefined;

  // Try Ed25519 first (preferred method)
  if (cdpApiKeyName && cdpApiPrivateKey) {
    try {
      jwt = await generateEd25519JWT(cdpApiKeyName, cdpApiPrivateKey);
      authMethod = 'EdDSA';
      console.log('Using Ed25519 JWT authentication');
    } catch (error) {
      console.warn('Ed25519 JWT generation failed, trying RS256:', error);
    }
  }

  // Try RSA format as fallback
  if (!jwt && cdpApiKeyName && cdpApiPrivateKey) {
    try {
      jwt = generateRS256JWT(cdpApiKeyName, cdpApiPrivateKey);
      authMethod = 'RS256';
      console.log('Using RS256 JWT authentication');
    } catch (error) {
      console.warn('RS256 JWT generation failed, trying legacy format:', error);
    }
  }

  // Fallback to legacy HMAC format
  if (!jwt && cdpApiKey && cdpApiSecret) {
    try {
      jwt = generateHS256JWT(cdpApiKey, cdpApiSecret);
      authMethod = 'HS256';
      console.log('Using HS256 JWT authentication (legacy)');
    } catch (error) {
      console.error('HS256 JWT generation failed:', error);
    }
  }

  if (!jwt) {
    throw new Error('No valid CDP API credentials found');
  }

  console.log('JWT generated successfully with', authMethod);
  return jwt;
}

// CDP API Client Class
export class CDPOnrampClient {
  private baseUrl = 'https://api.developer.coinbase.com/onramp/v1';

  async getSessionToken(request: CDPSessionTokenRequest): Promise<CDPSessionTokenResponse> {
    const jwt = await generateCDPJWT();
    
    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Session token request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  async getBuyQuote(request: CDPBuyQuoteRequest): Promise<CDPBuyQuoteResponse> {
    const jwt = await generateCDPJWT();
    
    const response = await fetch(`${this.baseUrl}/buy/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Buy quote request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }
}

// Utility functions for common use cases
export const cdpOnrampClient = new CDPOnrampClient();

// Helper function to create a session token for a wallet
export async function createSessionTokenForWallet(
  walletAddress: string, 
  clientIp: string = '8.8.8.8',
  component: string = 'unknown'
): Promise<string> {
  const request: CDPSessionTokenRequest = {
    clientIp,
    addresses: [
      {
        address: walletAddress,
        blockchains: ['base']
      }
    ],
    assets: ['USDC'],
    requestId: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    component,
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  const response = await cdpOnrampClient.getSessionToken(request);
  return response.token;
}

// Helper function to get a buy quote
export async function getBuyQuote(
  walletAddress: string,
  paymentAmount: string = '10.00',
  paymentCurrency: string = 'USD',
  purchaseCurrency: string = 'USDC',
  purchaseNetwork: string = 'base',
  country: string = 'US',
  clientIp: string = '8.8.8.8'
): Promise<CDPBuyQuoteResponse> {
  const request: CDPBuyQuoteRequest = {
    clientIp,
    country,
    destinationAddress: walletAddress,
    paymentAmount,
    paymentCurrency,
    paymentMethod: 'CARD',
    purchaseCurrency,
    purchaseNetwork
  };

  return await cdpOnrampClient.getBuyQuote(request);
}

// Example usage functions
export const examples = {
  // Example 1: Get session token
  async getSessionTokenExample() {
    try {
      const token = await createSessionTokenForWallet(
        '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
        '8.8.8.8',
        'GameEntry'
      );
      return token;
    } catch (error) {
      console.error('Error getting session token:', error);
      throw error;
    }
  },

  // Example 2: Get buy quote
  async getBuyQuoteExample() {
    try {
      const quote = await getBuyQuote(
        '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
        '10.00',
        'USD',
        'USDC',
        'base',
        'US',
        '8.8.8.8'
      );
      console.log('Buy quote:', quote);
      return quote;
    } catch (error) {
      console.error('Error getting buy quote:', error);
      throw error;
    }
  },

  // Example 3: Complete flow - session token + buy quote
  async completeFlowExample() {
    try {
      // Step 1: Get session token
      const sessionToken = await createSessionTokenForWallet(
        '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
        '8.8.8.8',
        'GameEntry'
      );

      // Step 2: Get buy quote
      const quote = await getBuyQuote(
        '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
        '10.00',
        'USD',
        'USDC',
        'base',
        'US',
        '8.8.8.8'
      );

      console.log('Complete flow results:', {
        sessionToken: sessionToken.substring(0, 20) + '...',
        quote
      });

      return { sessionToken, quote };
    } catch (error) {
      console.error('Error in complete flow:', error);
      throw error;
    }
  }
};
