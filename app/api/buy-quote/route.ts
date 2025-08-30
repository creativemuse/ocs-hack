import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateRS256JWT(apiKeyName: string, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: apiKeyName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  let formattedPrivateKey = privateKey.replace(/\\n/g, '\n').trim();
  if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`;
  }

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedPayload}`);
  const signature = sign.sign(formattedPrivateKey, 'base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function generateHS256JWT(apiKey: string, apiSecret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: apiKey,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const walletAddress: string | undefined = body.walletAddress;
    const purchaseCurrency: string = body.purchaseCurrency || 'USDC';
    const purchaseNetwork: string = body.purchaseNetwork || 'base';
    const paymentAmount: string = body.paymentAmount || '1.00';
    const paymentCurrency: string = body.paymentCurrency || 'USD';
    const paymentMethod: string = body.paymentMethod || 'CARD';
    const country: string = body.country || 'US';
    const subdivision: string | undefined = body.subdivision;

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    const cdpApiKeyName = process.env.CDP_API_KEY_NAME;
    const cdpApiPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
    const cdpApiKey = process.env.CDP_API_KEY;
    const cdpApiSecret = process.env.CDP_API_SECRET;

    let jwt: string | undefined;
    if (cdpApiKeyName && cdpApiPrivateKey) {
      try {
        jwt = generateRS256JWT(cdpApiKeyName, cdpApiPrivateKey);
      } catch (e) {
        console.warn('RS256 JWT generation failed, trying HS256', e);
      }
    }
    if (!jwt && cdpApiKey && cdpApiSecret) {
      jwt = generateHS256JWT(cdpApiKey, cdpApiSecret);
    }
    if (!jwt) {
      return NextResponse.json({ error: 'Server configuration error - no valid CDP credentials' }, { status: 500 });
    }

    const quoteRequestBody: Record<string, unknown> = {
      purchaseCurrency,
      purchaseNetwork,
      paymentAmount,
      paymentCurrency,
      paymentMethod,
      country,
      destinationAddress: walletAddress,
    };
    if (subdivision) quoteRequestBody.subdivision = subdivision;

    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/buy/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(quoteRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Buy quote failed:', errorText);
      return NextResponse.json({ error: `Failed to create buy quote: ${response.status} ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      onrampUrl: data.onrampUrl || null,
      quoteId: data.quoteId || null,
      purchaseAmount: data.purchaseAmount || null,
      paymentTotal: data.paymentTotal || null,
    });
  } catch (error) {
    console.error('Error creating buy quote:', error);
    return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}


