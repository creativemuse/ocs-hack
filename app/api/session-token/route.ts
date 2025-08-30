import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Function to generate JWT for CDP API authentication using RSA-SHA256
function generateRS256JWT(apiKeyName: string, privateKey: string): string {
  try {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const payload = {
      iss: apiKeyName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
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
      typ: 'JWT'
    };

    const payload = {
      iss: apiKey,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
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

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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

    let jwt: string;
    let authMethod: string;

    // Try new RSA format first
    if (cdpApiKeyName && cdpApiPrivateKey && cdpProjectId) {
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
      console.error('No valid CDP API credentials found');
      return NextResponse.json(
        { error: 'Server configuration error - no valid CDP credentials' },
        { status: 500 }
      );
    }

    console.log('JWT generated successfully with', authMethod);

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

    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
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
      return NextResponse.json(
        { error: `Failed to generate session token: ${response.status} ${response.statusText}` },
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
