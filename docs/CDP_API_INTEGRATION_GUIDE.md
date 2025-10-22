# CDP Onramp API Integration Guide

This guide explains how to use the Coinbase Developer Platform (CDP) Onramp API in your application.

## Overview

The CDP Onramp API allows you to:
- Generate session tokens for secure user authentication
- Get buy quotes for cryptocurrency purchases
- Create one-click buy URLs for seamless user experience

## Quick Start

### 1. Environment Setup

Make sure your `.env.local` file contains the required CDP credentials:

```bash
# New CDP API credentials (recommended)
CDP_API_KEY_NAME=your_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
CDP_PROJECT_ID=your_project_id

# Legacy credentials (fallback)
CDP_API_KEY=your_api_key
CDP_API_SECRET=your_api_secret
```

### 2. Basic Usage

```typescript
import { createSessionTokenForWallet, getBuyQuote } from '../lib/apis/cdp-onramp';

// Generate a session token
const sessionToken = await createSessionTokenForWallet(
  '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67', // wallet address
  '8.8.8.8', // client IP
  'GameEntry' // component name
);

// Get a buy quote
const quote = await getBuyQuote(
  '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67', // wallet address
  '10.00', // payment amount
  'USD', // payment currency
  'USDC', // purchase currency
  'base', // network
  'US', // country
  '8.8.8.8' // client IP
);
```

## API Endpoints

### Session Token API

**Endpoint:** `POST https://api.developer.coinbase.com/onramp/v1/token`

**Purpose:** Generate a session token for secure user authentication.

**Request Body:**
```typescript
{
  clientIp: string;
  addresses: Array<{
    address: string;
    blockchains: string[];
  }>;
  assets: string[];
  requestId?: string;
  component?: string;
  sessionId?: string;
}
```

**Response:**
```typescript
{
  token: string;
  expiresAt?: string;
}
```

### Buy Quote API

**Endpoint:** `POST https://api.developer.coinbase.com/onramp/v1/buy/quote`

**Purpose:** Get a quote for buying cryptocurrency.

**Request Body:**
```typescript
{
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
```

**Response:**
```typescript
{
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
```

## Authentication

The CDP API uses JWT authentication with multiple supported algorithms:

1. **Ed25519 (EdDSA)** - Recommended
2. **RSA-SHA256 (RS256)** - Alternative
3. **HMAC-SHA256 (HS256)** - Legacy

The authentication is handled automatically by the `generateCDPJWT()` function, which tries each method in order until one succeeds.

## Client Class Usage

```typescript
import { CDPOnrampClient } from '../lib/apis/cdp-onramp';

const client = new CDPOnrampClient();

// Get session token
const sessionResponse = await client.getSessionToken({
  clientIp: '8.8.8.8',
  addresses: [{
    address: '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
    blockchains: ['base']
  }],
  assets: ['USDC']
});

// Get buy quote
const quoteResponse = await client.getBuyQuote({
  clientIp: '8.8.8.8',
  country: 'US',
  destinationAddress: '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
  paymentAmount: '10.00',
  paymentCurrency: 'USD',
  purchaseCurrency: 'USDC',
  purchaseNetwork: 'base'
});
```

## Testing

Run the test script to verify your CDP API integration:

```bash
npm run test:cdp-api
```

This will test:
- Session token generation
- Buy quote creation
- Complete flow integration
- Custom request examples

## Error Handling

The API client includes comprehensive error handling for common issues:

### Common Errors

1. **401 Unauthorized**
   - Check your API credentials
   - Verify JWT generation is working
   - Ensure your project has the correct permissions

2. **403 Forbidden**
   - Check if your IP is whitelisted
   - Verify your project has access to the Onramp API
   - Check if you're using the correct environment

3. **No valid CDP API credentials**
   - Ensure environment variables are set
   - Check the format of your private key
   - Verify your API key name matches exactly

### Error Response Format

```typescript
{
  error: string;
  message?: string;
  details?: any;
}
```

## Security Considerations

1. **Environment Variables**: Never commit API credentials to version control
2. **IP Whitelisting**: Configure your CDP project to only allow requests from trusted IPs
3. **Rate Limiting**: The API has a 10 requests per second limit per app ID
4. **JWT Expiration**: JWTs expire after 2 minutes for security

## Integration Examples

### React Component Example

```typescript
import { useState } from 'react';
import { createSessionTokenForWallet, getBuyQuote } from '../lib/apis/cdp-onramp';

export function BuyCryptoComponent({ walletAddress }: { walletAddress: string }) {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const handleGetQuote = async () => {
    setLoading(true);
    try {
      const buyQuote = await getBuyQuote(
        walletAddress,
        '10.00',
        'USD',
        'USDC',
        'base',
        'US'
      );
      setQuote(buyQuote);
    } catch (error) {
      console.error('Failed to get quote:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGetQuote} disabled={loading}>
        {loading ? 'Getting Quote...' : 'Get Buy Quote'}
      </button>
      {quote && (
        <div>
          <p>Purchase Amount: {quote.purchaseAmount} USDC</p>
          <p>Payment Total: {quote.paymentTotal} USD</p>
          {quote.onrampUrl && (
            <a href={quote.onrampUrl} target="_blank" rel="noopener noreferrer">
              Complete Purchase
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

### Next.js API Route Example

```typescript
// app/api/buy-quote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBuyQuote } from '../../../lib/apis/cdp-onramp';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, paymentAmount, paymentCurrency } = await req.json();
    
    const quote = await getBuyQuote(
      walletAddress,
      paymentAmount,
      paymentCurrency,
      'USDC',
      'base',
      'US'
    );
    
    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## Troubleshooting

### JWT Generation Issues

If JWT generation fails, check:

1. **Private Key Format**: Ensure your private key is in proper PEM format
2. **API Key Name**: Verify the API key name matches exactly
3. **Environment Variables**: Check that all required variables are set
4. **CDP SDK**: Ensure `@coinbase/cdp-sdk` is installed and up to date

### Network Issues

If you're getting network errors:

1. **CORS**: Check if CORS is properly configured for your domain
2. **Firewall**: Ensure your server can make outbound HTTPS requests
3. **DNS**: Verify that `api.developer.coinbase.com` resolves correctly

### Rate Limiting

If you hit rate limits:

1. **Implement Backoff**: Add exponential backoff to your requests
2. **Cache Results**: Cache quotes and session tokens when appropriate
3. **Batch Requests**: Combine multiple operations when possible

## Support

For additional support:

1. **CDP Documentation**: https://docs.cdp.coinbase.com/
2. **API Reference**: https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/
3. **Coinbase Support**: Contact Coinbase Developer Support

## Changelog

- **v1.0.0**: Initial implementation with EdDSA, RS256, and HS256 JWT support
- **v1.0.1**: Added comprehensive error handling and testing
- **v1.0.2**: Added React component examples and Next.js API route examples
