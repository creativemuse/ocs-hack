import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

// Function to generate JWT for CDP API authentication using Ed25519 (EdDSA)
async function generateEd25519JWT(apiKeyName: string, privateKey: string): Promise<string> {
  try {
    // Use the CDP SDK to generate JWT with Ed25519
    const token = await generateJwt({
      apiKeyId: apiKeyName,
      apiKeySecret: privateKey,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
      expiresIn: 120 // 2 minutes expiration as per Coinbase docs
    });
    
    return token;
  } catch (error) {
    console.error('Error generating Ed25519 JWT:', error);
    throw new Error(`Ed25519 JWT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to generate JWT for CDP API authentication using RSA-SHA256 (fallback)
function generateRS256JWT(apiKeyName: string, privateKey: string): string {
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
      // Normalize escaped newlines from env vars
      .replace(/\\n/g, '\n')
      .trim();
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      // If it's not in PEM format, try to format it
      formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`;
    }
    
    // Use RS256 signing with the private key
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${encodedHeader}.${encodedPayload}`);
    const signature = sign.sign(formattedPrivateKey, 'base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error('Error generating RS256 JWT:', error);
    throw new Error(`RS256 JWT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to generate JWT for CDP API authentication using HMAC-SHA256 (legacy)
function generateHS256JWT(apiKey: string, apiSecret: string): string {
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
    
    console.log('HS256 JWT payload:', JSON.stringify(payload, null, 2));

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

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Must be a valid Ethereum address (42 characters starting with 0x)' },
        { status: 400 }
      );
    }

    // Check for CDP API credentials - try new format first, then legacy
    const cdpApiKeyName = process.env.CDP_API_KEY_NAME;
    const cdpApiPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
    const cdpProjectId = process.env.CDP_PROJECT_ID;
    const cdpApiKey = process.env.CDP_API_KEY;
    const cdpApiSecret = process.env.CDP_API_SECRET;

    console.log('CDP API Key Name present:', !!cdpApiKeyName);
    console.log('CDP API Private Key present:', !!cdpApiPrivateKey);
    console.log('CDP Project ID present:', !!cdpProjectId);
    console.log('Legacy CDP API Key present:', !!cdpApiKey);
    console.log('Legacy CDP API Secret present:', !!cdpApiSecret);

    let jwt: string | undefined;
    let authMethod: string | undefined;

    // Try Ed25519 first (preferred method)
    if (cdpApiKeyName && cdpApiPrivateKey && cdpProjectId) {
      try {
        jwt = await generateEd25519JWT(cdpApiKeyName, cdpApiPrivateKey);
        authMethod = 'EdDSA';
        console.log('Using Ed25519 JWT authentication');
      } catch (error) {
        console.warn('Ed25519 JWT generation failed, trying RS256:', error);
      }
    }

    // Try RSA format as fallback
    if (!jwt && cdpApiKeyName && cdpApiPrivateKey && cdpProjectId) {
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
        console.log('API Key (first 10 chars):', cdpApiKey.substring(0, 10) + '...');
        console.log('API Secret (first 10 chars):', cdpApiSecret.substring(0, 10) + '...');
        console.log('JWT (first 50 chars):', jwt.substring(0, 50) + '...');
      } catch (error) {
        console.error('HS256 JWT generation failed:', error);
      }
    }

    if (!jwt) {
      console.error('No valid CDP API credentials found');
      return NextResponse.json(
        { error: 'Server configuration error - no valid CDP credentials' },
        { status: 500 }
      );
    }

    console.log('JWT generated successfully with', authMethod);
    console.log('Wallet address received:', walletAddress);
    console.log('Wallet address length:', walletAddress.length);

    // Generate a session token using the CDP API with JWT authentication
    const requestBody = {
      addresses: [
        {
          address: walletAddress,
          blockchains: ['base']
        }
      ],
      assets: ['USDC']
    };

    console.log('Making CDP API request with body:', JSON.stringify(requestBody, null, 2));

    const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/token';
    console.log('Making request to:', apiUrl);
    console.log('Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt.substring(0, 50)}...`
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('CDP API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Session token generation failed:', errorText);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Try to parse the error response as JSON
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If it's not JSON, use the raw text
        errorMessage = errorText || errorMessage;
      }
      
      return NextResponse.json(
        { error: `Failed to generate session token: ${errorMessage}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Session token generated successfully');
    
    return NextResponse.json({
      sessionToken: data.token,
    });
  } catch (error) {
    console.error('Error generating session token:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
