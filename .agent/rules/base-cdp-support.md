---
trigger: model_decision
description: Build onchain apps supporting both Base Account and CDP Embedded Wallets
---

# Coinbase Developer Platform

> Build onchain apps supporting both Base Account and CDP Embedded Wallets

# Integrate Base Account with CDP Embedded Wallets

Learn how to build an onchain app that seamlessly supports both **existing Base Account users** and **new users** through CDP Embedded Wallets, providing unified authentication and wallet management.

## Overview

This integration enables your app to serve two distinct user types:

* **Existing Base users**: Connect with their Base Account for a familiar experience
* **New onchain users**: Create CDP Embedded Wallets via email, mobile, or social authentication

Both user types get the same app functionality while using their preferred wallet type.

## What you'll build

* **Unified authentication flow**: Single sign-in supporting both wallet types
* **Automatic wallet detection**: Smart routing based on user's existing wallet status
* **Consistent user experience**: Both wallet types access the same app features

## Prerequisites

* Node.js 18+ installed
* React application (Next.js recommended)
* [CDP Portal account](https://portal.cdp.coinbase.com/) with Project ID
* Basic familiarity with Wagmi and React hooks

## Installation

Install the required packages for both CDP Embedded Wallets and Base Account support:

```bash  theme={null}
npm install @coinbase/cdp-core @coinbase/cdp-hooks @base-org/account @tanstack/react-query viem wagmi
```

## Step-by-step implementation

Since native CDP + Base Account integration is under development, this guide uses a **dual connector approach** where both wallet types are supported through separate, coordinated connectors.

You can use the Base Account Wagmi connector alongside CDP's React provider system to create a unified experience that properly handles wallet persistence for both wallet types.

### Step 1: Environment configuration

Create environment variables for your CDP project:

```bash  theme={null}
# .env.local
NEXT_PUBLIC_CDP_PROJECT_ID=your_cdp_project_id
NEXT_PUBLIC_APP_NAME="Your App Name"
```

Get your CDP Project ID from the [CDP Portal](https://portal.cdp.coinbase.com/).

⚠️ **Critical**: Without a valid `NEXT_PUBLIC_CDP_PROJECT_ID`, the app will fail to load with "Project ID is required" errors. Also configure your domain in CDP Portal → Wallets → Embedded Wallet settings for CORS.

### Step 2: Configure Wagmi for Base Account support

Set up Wagmi with the Base Account connector (embedded wallets will be handled separately via CDP React providers):

```typescript  theme={null}
// config/wagmi.ts
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { baseAccount } from 'wagmi/connectors';

// Base Account connector
const baseAccountConnector = baseAccount({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Your App',
});

// Wagmi config (only for Base Account - embedded wallets handled by CDP React providers)
export const wagmiConfig = createConfig({
  connectors: [baseAccountConnector],
  chains: [baseSepolia, base], // Put baseSepolia first for testing
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
```

### Step 3: Set up application providers

Wrap your application with the necessary providers. **Important**: Use `CDPHooksProvider` to properly manage embedded wallet authentication state:

```typescript  theme={null}
// app/layout.tsx
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CDPHooksProvider } from '@coinbase/cdp-hooks';
import { wagmiConfig } from '../config/wagmi';

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CDPHooksProvider 
          config={{
            projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID!,
          }}
        >
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </WagmiProvider>
        </CDPHooksProvider>
      </body>
    </html>
  );
}
```

### Step 4: Create unified authentication hook

Build a custom hook to manage both wallet types. Using `CDPHooksProvider` ensures users get their existing embedded wallets when they sign in again, rather than creating new ones each time.

```typescript  theme={null}
// hooks/useUnifiedAuth.ts
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useSignInWithEmail, useVerifyEmailOTP, useIsSignedIn, useEvmAddress, useSignOut } from '@coinbase/cdp-hooks';
import { useState, useEffect } from 'react';

export type WalletType = 'base_account' | 'embedded' | 'none';

export function useUnifiedAuth() {
  // Wagmi hooks for Base Account
  const { address: wagmiAddress, isConnected: wagmiConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // CDP hooks for embedded wallet - these work with CDPHooksProvider
  const { signInWithEmail, isLoading: isSigningIn } = useSignInWithEmail();
  const { verifyEmailOTP, isLoading: isVerifying } = useVerifyEmailOTP();
  const { isSignedIn: cdpSignedIn } = useIsSignedIn();
  const { evmAddress: cdpAddress } = useEvmAddress();
  const { signOut } = useSignOut();

  const [walletType, setWalletType] = useState<WalletType>('none');
  const [flowId, setFlowId] = useState<string>('');

  // Determine which wallet is active and prioritize the active one
  const address = wagmiConnected ? wagmiAddress : cdpAddress;
  const isConnected = wagmiConnected || cdpSignedIn;

  useEffect(() => {
    if (wagmiConnected && connector?.name === 'Base Account') {
      setWalletType('base_account');
    } else if (cdpSignedIn && cdpAddress) {
      setWalletType('embedded');
    } else {
      setWalletType('none');
    }
  }, [wagmiConnected, cdpSignedIn, connector, cdpAddress]);

  const connectBaseAccount = () => {
    const baseConnector = connectors.find(c => c.name === 'Base Account');
    if (baseConnector) {
      connect({ connector: baseConnector });
    }
  };

  const signInWithEmbeddedWallet = async (email: string) => {
    try {
      const response = await signInWithEmail({ email });

      // Capture flowId for OTP verification
      if (response && typeof response === 'object' && 'flowId' in response) {
        setFlowId(response.flowId as string);
      }

      return true;
    } catch (error) {
      console.error('Failed to sign in with email:', error);
      return false;
    }
  };

  const verifyOtpAndConnect = async (otp: string) => {
    try {
      // With CDPReactProvider, verifyEmailOTP automatically signs the user in
      await verifyEmailOTP({ flowId, otp });
      return true;
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      return false;
    }
  };

  const disconnect = async () => {
    if (wagmiConnected) {
      wagmiDisconnect();
    }

    if (cdpSignedIn || walletType === 'embedded') {
      try {
        await signOut();
      } catch (error) {
        console.error('CDP sign out failed:', error);
      }
    }
  };

  return {
    address,
    isConnected,
    walletType,
    connectBaseAccount,
    signInWithEmbeddedWallet,
    verifyOtpAndConnect,
    disconnect,
    isSigningIn,
    isVerifying,
  };
}
```

### Step 5: Build authentication component

Create a component that presents both authentication options:

```typescript  theme={null}
// components/WalletAuthButton.tsx
'use client';

import { useState } from 'react';
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';

export function WalletAuthButton() {
  const {
    address,
    isConnected,
    walletType,
    connectBaseAccount,
    signInWithEmbeddedWallet,
    verifyOtpAndConnect,
    disconnect,
    isSigningIn,
    isVerifying,
  } = useUnifiedAuth();

  const [authStep, setAuthStep] = useState<'select' | 'email' | 'otp'>('select');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Connected state
  if (isConnected && address) {
    const walletDisplay = {
      base_account: { name: 'Base Account', icon: '🟦' },
      embedded: { name: 'Embedded Wallet', icon: '📱' },
    }[walletType] || { name: 'Connected', icon: '✅' };

    return (
      <div className="flex items-center space-x-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
        <span>{walletDisplay.icon}</span>
        <div>
          <div className="font-medium text-green-800">{walletDisplay.name}</div>
          <div className="text-xs text-green-600 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        <button onClick={() => disconnect()} className="text-sm text-red-600">
          Disconnect
        </button>
      </div>
    );
  }

  // OTP verification
  if (authStep === 'otp') {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="text-center">
          <h3 className="font-semibold">Check your email</h3>
          <p className="text-sm text-gray-600">Enter the code sent to {email}</p>
        </div>

        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className="w-full px-3 py-2 border rounded text-center font-mono"
        />

        <div className="space-y-2">
          <button
            onClick={() => verifyOtpAndConnect(otp)}
            disabled={otp.length !== 6 || isVerifying}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isVerifying ? 'Creating account...' : 'Verify & create account'}
          </button>

          <button
            onClick={() => setAuthStep('email')}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Email input
  if (authStep === 'email') {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-semibold text-center">Create account</h3>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 border rounded"
        />

        <div className="space-y-2">
          <button
            onClick={async () => {
              const success = await signInWithEmbeddedWallet(email);
              if (success) setAuthStep('otp');
            }}
            disabled={!email || isSigningIn}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isSigningIn ? 'Sending Code...' : 'Send Verification Code'}
          </button>

          <button
            onClick={() => setAuthStep('select')}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Initial selection
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-center mb-4">Connect Your Wallet</h2>

      <button
        onClick={connectBaseAccount}
        className="w-full p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🟦</span>
          <div className="text-left">
            <div className="font-semibold">Sign in with Base</div>
            <div className="text-sm text-gray-600">I have a Base Account</div>
          </div>
        </div>
      </butt