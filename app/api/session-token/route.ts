import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { logger, apiLogger } from '@/lib/utils/logger';
import { isOriginAllowed, getCorsHeaders, getSecurityHeaders } from '@/lib/utils/cors';

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
    logger.error('Error generating Ed25519 JWT:', error);
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
    logger.error('Error generating RS256 JWT:', error);
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
    
    logger.debug('HS256 JWT payload:', JSON.stringify(payload, null, 2));

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    logger.error('Error generating HS256 JWT:', error);
    throw new Error(`HS256 JWT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  // For mobile-only integrations, do not return Access-Control-Allow-Origin header
  // For web clients, only allow requests from approved origins
  if (origin && isOriginAllowed(origin)) {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(origin),
    });
  }
  
  // Block unauthorized origins
  apiLogger.warn('OPTIONS', '/api/session-token', `Blocked unauthorized origin: ${origin}`);
  return new Response(null, { 
    status: 403,
    headers: getSecurityHeaders()
  });
}

export async function POST(req: NextRequest) {
  try {
    // CORS Protection - Only allow requests from approved origins
    const origin = req.headers.get('origin');
    
    // Enhanced CORS Protection - Only allow requests from approved origins
    if (origin && !isOriginAllowed(origin)) {
      apiLogger.warn('POST', '/api/session-token', `Blocked unauthorized origin: ${origin}`);
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { 
          status: 403,
          headers: getSecurityHeaders()
        }
      );
    }

    const { walletAddress, requestId, component } = await req.json();
    
    // Log the request details for debugging
    logger.debug('Session token request:', { requestId, walletAddress, component: component || 'unknown' });

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Must be a valid Ethereum address (42 characters starting with 0x)' },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Enhanced Client IP extraction and validation
    // Priority order for IP extraction (most trusted first)
    const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare (most trusted)
    const xClientIp = req.headers.get('x-client-ip');
    const xRealIp = req.headers.get('x-real-ip');
    const forwardedFor = req.headers.get('x-forwarded-for');
    
    // Extract client IP with proper validation
    let clientIp: string;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, prioritize trusted headers from your infrastructure
      clientIp = cfConnectingIp || xClientIp || xRealIp || 
                 (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || 
                 '8.8.8.8'; // Fallback to public IP
    } else {
      // In development, use a consistent public IP for testing
      clientIp = '8.8.8.8';
    }
    
    // Validate IP format (basic IPv4 validation)
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(clientIp)) {
      logger.warn('Invalid IP format detected, using fallback:', clientIp);
      clientIp = '8.8.8.8';
    }
    
    logger.debug('Client IP validated:', clientIp);

    // Check for CDP API credentials - try new format first, then legacy
    const cdpApiKeyName = process.env.CDP_API_KEY_NAME;
    const cdpApiPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
    const cdpProjectId = process.env.CDP_PROJECT_ID;
    const cdpApiKey = process.env.CDP_API_KEY;
    const cdpApiSecret = process.env.CDP_API_SECRET;

    logger.debug('CDP credentials check:', {
      hasKeyName: !!cdpApiKeyName,
      hasPrivateKey: !!cdpApiPrivateKey,
      hasProjectId: !!cdpProjectId,
      hasLegacyKey: !!cdpApiKey,
      hasLegacySecret: !!cdpApiSecret
    });

    let jwt: string | undefined;
    let authMethod: string | undefined;

    // Try Ed25519 first (preferred method)
    if (cdpApiKeyName && cdpApiPrivateKey && cdpProjectId) {
      try {
        jwt = await generateEd25519JWT(cdpApiKeyName, cdpApiPrivateKey);
        authMethod = 'EdDSA';
        logger.debug('Using Ed25519 JWT authentication');
      } catch (error) {
        logger.warn('Ed25519 JWT generation failed, trying RS256:', error);
      }
    }

    // Try RSA format as fallback
    if (!jwt && cdpApiKeyName && cdpApiPrivateKey && cdpProjectId) {
      try {
        jwt = generateRS256JWT(cdpApiKeyName, cdpApiPrivateKey);
        authMethod = 'RS256';
        logger.debug('Using RS256 JWT authentication');
      } catch (error) {
        logger.warn('RS256 JWT generation failed, trying legacy format:', error);
      }
    }

    // Fallback to legacy HMAC format
    if (!jwt && cdpApiKey && cdpApiSecret) {
      try {
        jwt = generateHS256JWT(cdpApiKey, cdpApiSecret);
        authMethod = 'HS256';
        logger.debug('Using HS256 JWT authentication (legacy)');
        logger.sensitive('API Key prefix', cdpApiKey.substring(0, 10));
        logger.sensitive('JWT prefix', jwt.substring(0, 50));
      } catch (error) {
        logger.error('HS256 JWT generation failed:', error);
      }
    }

    if (!jwt) {
      apiLogger.error('POST', '/api/session-token', 'No valid CDP API credentials found');
      return NextResponse.json(
        { error: 'Server configuration error - no valid CDP credentials' },
        { status: 500, headers: getCorsHeaders(origin) }
      );
    }

    logger.debug('JWT generated successfully with', authMethod);

    // Generate a session token using the CDP API with JWT authentication
    const requestBody = {
      addresses: [
        {
          address: walletAddress,
          blockchains: ['base']
        }
      ],
      assets: ['USDC'],
      clientIp: clientIp,
      // Add unique request identifier to ensure each request is unique
      requestId: requestId || `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      // Add component identifier to ensure different components get different tokens
      component: component || 'unknown',
      // Add session-specific identifier to prevent token reuse
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    logger.debug('CDP API request:', { url: 'https://api.developer.coinbase.com/onramp/v1/token', requestId });

    const apiUrl = 'https://api.developer.coinbase.com/onramp/v1/token';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(requestBody),
    });

    logger.debug('CDP API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      
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
      
      apiLogger.error('POST', '/api/session-token', `CDP API failed: ${errorMessage}`);
      
      return NextResponse.json(
        { error: `Failed to generate session token: ${errorMessage}` },
        { status: response.status, headers: getCorsHeaders(origin) }
      );
    }

    const data = await response.json();
    logger.debug('Session token generated successfully', { requestId });
    
    apiLogger.success('POST', '/api/session-token', { requestId });
    
    // Return success response with CORS headers and security headers
    return NextResponse.json(
      { sessionToken: data.token },
      { headers: getCorsHeaders(origin) }
    );
  } catch (error) {
    apiLogger.error('POST', '/api/session-token', error);
    const origin = req.headers.get('origin');
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}
