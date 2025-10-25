import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const keyName = process.env.CDP_API_KEY;
    const keySecret = process.env.CDP_API_SECRET;

    if (!keyName || !keySecret) {
      return NextResponse.json({
        error: 'CDP credentials not found'
      }, { status: 400 });
    }

    // Test different authentication methods
    const timestamp = Date.now();
    const method = 'POST';
    const host = 'api.cdp.coinbase.com';
    const path = '/platform/v2/data/query/run';
    
    // Method 1: Try with API key in Authorization header (simpler)
    const response1 = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': keyName,
        'Content-Type': 'application/json',
        'X-Authorization-Timestamp': timestamp.toString()
      },
      body: JSON.stringify({ sql: 'SELECT 1 as test' })
    });

    console.log('Method 1 (API Key only) response:', {
      status: response1.status,
      statusText: response1.statusText
    });

    // Method 2: Try with HMAC signature
    const message = `${method} ${host}${path}\n${timestamp}`;
    const signature = createHmac('sha256', keySecret).update(message).digest('hex');
    
    const response2 = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': keyName,
        'Content-Type': 'application/json',
        'X-Authorization-Timestamp': timestamp.toString(),
        'X-Authorization-Signature-SHA256': signature
      },
      body: JSON.stringify({ sql: 'SELECT 1 as test' })
    });

    console.log('Method 2 (API Key + HMAC) response:', {
      status: response2.status,
      statusText: response2.statusText
    });

    // Method 3: Try with JWT (current method)
    const jwt = generateJWT(keyName, keySecret, method, host, path);
    const response3 = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: 'SELECT 1 as test' })
    });

    console.log('Method 3 (JWT) response:', {
      status: response3.status,
      statusText: response3.statusText
    });

    return NextResponse.json({
      results: {
        method1_apiKeyOnly: {
          status: response1.status,
          statusText: response1.statusText,
          success: response1.ok
        },
        method2_apiKeyWithHMAC: {
          status: response2.status,
          statusText: response2.statusText,
          success: response2.ok
        },
        method3_jwt: {
          status: response3.status,
          statusText: response3.statusText,
          success: response3.ok
        }
      },
      timestamp,
      message: 'Tested 3 different authentication methods'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Authentication test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to generate JWT (simplified version)
function generateJWT(keyName: string, keySecret: string, method: string, host: string, path: string): string {
  const header = {
    alg: 'HS256',
    kid: keyName,
    nonce: randomBytes(16).toString('hex')
  };

  const payload = {
    iss: 'cdp',
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    sub: keyName,
    uri: `${method} ${host}${path}`
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', keySecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}
