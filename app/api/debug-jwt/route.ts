import { NextRequest, NextResponse } from 'next/server';
import { CDPJWTGenerator } from '@/lib/cdp/jwt-generator';

export async function GET(req: NextRequest) {
  try {
    // Check environment variables
    const keyName = process.env.CDP_API_KEY;
    const keySecret = process.env.CDP_API_SECRET;

    if (!keyName || !keySecret) {
      return NextResponse.json({
        error: 'CDP credentials not found',
        hasKey: !!keyName,
        hasSecret: !!keySecret
      }, { status: 400 });
    }

    // Create JWT generator
    const config = {
      keyName,
      keySecret,
      requestMethod: 'POST',
      requestHost: 'api.cdp.coinbase.com',
      requestPath: '/platform/v2/data/query/run',
    };

    const jwtGenerator = new CDPJWTGenerator(config);
    const jwt = jwtGenerator.generateJWT();

    // Decode the JWT to inspect its contents
    const decoded = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());

    return NextResponse.json({
      success: true,
      jwtLength: jwt.length,
      jwtPreview: jwt.substring(0, 50) + '...',
      decodedPayload: decoded,
      config: {
        keyNameLength: keyName.length,
        keySecretLength: keySecret.length,
        requestMethod: config.requestMethod,
        requestHost: config.requestHost,
        requestPath: config.requestPath
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'JWT generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
