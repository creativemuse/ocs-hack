/**
 * CDP Onramp API Usage Examples
 * 
 * These examples show how to use the CDP Onramp API in your application.
 * Based on your existing working implementation in app/api/session-token/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

// Example 1: Basic session token generation (based on your existing code)
export async function generateSessionTokenExample(walletAddress: string) {
  // This is how your existing code works in app/api/session-token/route.ts
  const requestBody = {
    addresses: [
      {
        address: walletAddress,
        blockchains: ['base']
      }
    ],
    assets: ['USDC'],
    clientIp: '8.8.8.8',
    requestId: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    component: 'GameEntry',
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  // Your existing JWT generation logic would go here
  // const jwt = await generateEd25519JWT(apiKeyName, privateKey);
  
  const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_JWT_TOKEN`, // Your generated JWT
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Session token request failed: ${response.status}`);
  }

  return await response.json();
}

// Example 2: Buy quote generation (based on your existing code in app/api/buy-quote/route.ts)
export async function generateBuyQuoteExample(walletAddress: string) {
  const quoteRequestBody = {
    purchaseCurrency: 'USDC',
    purchaseNetwork: 'base',
    paymentAmount: '10.00',
    paymentCurrency: 'USD',
    paymentMethod: 'CARD',
    country: 'US',
    destinationAddress: walletAddress,
  };

  // Your existing JWT generation logic would go here
  // const jwt = await generateEd25519JWT(apiKeyName, privateKey);

  const response = await fetch('https://api.developer.coinbase.com/onramp/v1/buy/quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_JWT_TOKEN`, // Your generated JWT
    },
    body: JSON.stringify(quoteRequestBody),
  });

  if (!response.ok) {
    throw new Error(`Buy quote request failed: ${response.status}`);
  }

  return await response.json();
}

// Example 3: Frontend usage with your existing API routes
export async function frontendUsageExample() {
  // Use your existing API routes
  const sessionResponse = await fetch('/api/session-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress: '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
      requestId: `frontend_${Date.now()}`,
      component: 'GameEntry'
    }),
  });

  const sessionData = await sessionResponse.json();
  console.log('Session token:', sessionData.sessionToken);

  // Get buy quote
  const quoteResponse = await fetch('/api/buy-quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress: '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
      paymentAmount: '10.00',
      paymentCurrency: 'USD',
      purchaseCurrency: 'USDC',
      purchaseNetwork: 'base',
      country: 'US'
    }),
  });

  const quoteData = await quoteResponse.json();
  console.log('Buy quote:', quoteData);
}

// Example 4: React component using your existing API
export function BuyCryptoButton({ walletAddress }: { walletAddress: string }) {
  const handleBuyCrypto = async () => {
    try {
      // Use your existing session token API
      const sessionResponse = await fetch('/api/session-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          requestId: `buy_${Date.now()}`,
          component: 'BuyButton'
        }),
      });

      const { sessionToken } = await sessionResponse.json();

      // Use your existing buy quote API
      const quoteResponse = await fetch('/api/buy-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          paymentAmount: '10.00',
          paymentCurrency: 'USD',
          purchaseCurrency: 'USDC',
          purchaseNetwork: 'base',
          country: 'US'
        }),
      });

      const quote = await quoteResponse.json();

      if (quote.onrampUrl) {
        // Redirect to the onramp URL for purchase
        window.open(quote.onrampUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to initiate crypto purchase:', error);
    }
  };

  return null; // This is an example file, not a component
}

// Example 5: Direct API usage (what you showed in your message)
export const directAPIExamples = {
  // Session token API call
  async getSessionToken() {
    const url = 'https://api.developer.coinbase.com/onramp/v1/token';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer <your-jwt-token>',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientIp: '8.8.8.8',
        addresses: [{
          address: '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
          blockchains: ['base']
        }],
        assets: ['USDC'],
        requestId: `api_${Date.now()}`,
        component: 'GameEntry',
        sessionId: `session_${Date.now()}`
      })
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log('Session token response:', data);
      return data;
    } catch (error) {
      console.error('Error getting session token:', error);
      throw error;
    }
  },

  // Buy quote API call
  async getBuyQuote() {
    const url = 'https://api.developer.coinbase.com/onramp/v1/buy/quote';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer <your-jwt-token>',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientIp: '8.8.8.8',
        country: 'US',
        destinationAddress: '0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67',
        paymentAmount: '10.00',
        paymentCurrency: 'USD',
        paymentMethod: 'CARD',
        purchaseCurrency: 'USDC',
        purchaseNetwork: 'base'
      })
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log('Buy quote response:', data);
      return data;
    } catch (error) {
      console.error('Error getting buy quote:', error);
      throw error;
    }
  }
};

// Example 6: Using OnchainKit Fund components (recommended approach)
export function OnchainKitFundExample() {
  // Instead of direct API calls, use OnchainKit components
  console.log('Use OnchainKit Fund components for the best user experience:');
  console.log('- FundButton - for adding crypto to wallets');
  console.log('- BuyButton - for purchasing crypto');
  console.log('- WalletDropdownFundLink - for wallet dropdown integration');
  return null;
}

// Summary of what's working in your application:
export const workingImplementationSummary = {
  sessionToken: {
    endpoint: '/api/session-token',
    method: 'POST',
    authentication: 'Ed25519 JWT (working)',
    status: '✅ Working',
    logs: 'Successfully generating session tokens with EdDSA'
  },
  buyQuote: {
    endpoint: '/api/buy-quote', 
    method: 'POST',
    authentication: 'RSA-SHA256 JWT (working)',
    status: '✅ Working',
    logs: 'Successfully creating buy quotes'
  },
  onchainkit: {
    analytics: 'Disabled (401 error fixed)',
    wallet: 'Working with proper API keys',
    status: '✅ Working',
    logs: 'OnchainKit provider configured correctly'
  }
};
