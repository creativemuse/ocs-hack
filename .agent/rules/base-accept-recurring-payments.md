---
trigger: model_decision
description: Enable subscription-based revenue models with automatic USDC payments
---

# Accept Recurring Payments

> Enable subscription-based revenue models with automatic USDC payments

export const Button = ({children, disabled, variant = "primary", size = "medium", iconName, roundedFull = false, className = '', fullWidth = false, onClick = undefined}) => {
  const variantStyles = {
    primary: 'bg-blue text-black border border-blue hover:bg-blue-80 active:bg-[#06318E] dark:text-white',
    secondary: 'bg-white border border-white text-palette-foreground hover:bg-zinc-15 active:bg-zinc-30',
    outlined: 'bg-transparent text-white border border-white hover:bg-white hover:text-black active:bg-[#E3E7E9]'
  };
  const sizeStyles = {
    medium: 'text-md px-4 py-2 gap-3',
    large: 'text-lg px-6 py-4 gap-5'
  };
  const sizeIconRatio = {
    medium: '0.75rem',
    large: '1rem'
  };
  const classes = ['text-md px-4 py-2 whitespace-nowrap', 'flex items-center justify-center', 'disabled:opacity-40 disabled:pointer-events-none', 'transition-all', variantStyles[variant], sizeStyles[size], roundedFull ? 'rounded-full' : 'rounded-lg', fullWidth ? 'w-full' : 'w-auto', className];
  const buttonClasses = classes.filter(Boolean).join(' ');
  const iconSize = sizeIconRatio[size];
  return <button type="button" disabled={disabled} className={buttonClasses} onClick={onClick}>
      <span>{children}</span>
      {iconName && <Icon name={iconName} width={iconSize} height={iconSize} color="currentColor" />}
    </button>;
};

export const BaseBanner = ({content = null, id, dismissable = true}) => {
  const LOCAL_STORAGE_KEY_PREFIX = 'cb-docs-banner';
  const [isVisible, setIsVisible] = useState(false);
  const onDismiss = () => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}-${id}`, 'false');
    setIsVisible(false);
  };
  useEffect(() => {
    const storedValue = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}-${id}`);
    setIsVisible(storedValue !== 'false');
  }, []);
  if (!isVisible) {
    return null;
  }
  return <div className="fixed bottom-0 left-0 right-0 bg-white py-8 px-4 lg:px-12 z-50 text-black dark:bg-black dark:text-white border-t dark:border-gray-95">
      <div className="flex items-center max-w-8xl mx-auto">
        {typeof content === 'function' ? content({
    onDismiss
  }) : content}
        {dismissable && <button onClick={onDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Dismiss banner">
          ✕
        </button>}
      </div>
    </div>;
};

export const SignInWithBaseButton = ({colorScheme = 'light'}) => {
  const isLight = colorScheme === 'light';
  return <button type="button" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: isLight ? '#ffffff' : '#000000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    color: isLight ? '#000000' : '#ffffff',
    minWidth: '180px',
    height: '44px'
  }}>
      <div style={{
    width: '16px',
    height: '16px',
    backgroundColor: isLight ? '#0000FF' : '#FFFFFF',
    borderRadius: '2px',
    flexShrink: 0
  }} />
      <span>Sign in with Base</span>
    </button>;
};

export const BasePayButton = ({colorScheme = 'light'}) => {
  const isLight = colorScheme === 'light';
  return <button type="button" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    backgroundColor: isLight ? '#ffffff' : '#0000FF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minWidth: '180px',
    height: '44px'
  }}>
      <img src={isLight ? '/images/base-account/BasePayBlueLogo.png' : '/images/base-account/BasePayWhiteLogo.png'} alt="Base Pay" style={{
    height: '20px',
    width: 'auto'
  }} />
    </button>;
};

## Start accepting recurring payments with Base Pay Subscriptions

Base Subscriptions enable you to build predictable, recurring revenue streams by accepting automatic USDC payments. Whether you're running a SaaS platform, content subscription service, or any business model requiring regular payments, Base Subscriptions provide a seamless solution with no merchant fees.

**Key Capabilities:**

<AccordionGroup>
  <Accordion title="Flexible Billing Periods">
    Support any billing cycle that fits your business model:

    * Daily subscriptions for short-term services
    * Weekly for regular deliveries or services
    * Monthly for standard SaaS subscriptions
    * Annual for discounted long-term commitments
    * Custom periods (e.g., 14 days, 90 days) for unique models
  </Accordion>

  <Accordion title="Partial and Usage-Based Charging">
    Charge any amount up to the permitted limit:

    * Fixed recurring amounts for predictable billing
    * Variable usage-based charges within a cap
    * Tiered pricing with different charge amounts
    * Prorated charges for mid-cycle changes
  </Accordion>

  <Accordion title="Subscription Management">
    Full control over the subscription lifecycle:

    * Real-time status checking to verify active subscriptions
    * Remaining charge amount for the current period
    * Next period start date for planning
    * Cancellation detection for immediate updates
  </Accordion>

  <Accordion title="Enterprise-Ready Features">
    Built for production use cases:

    * No transaction fees or platform cuts
    * Instant settlement in USDC stablecoin
    * Testnet support for development and testing
    * Detailed transaction history for accounting
    * Programmatic access via SDK
  </Accordion>
</AccordionGroup>

## How It Works

Base Subscriptions leverage **Spend Permissions** – a powerful onchain primitive that allows users to grant revocable spending rights to applications. Here's the complete flow:

<Steps>
  <Step title="User Approves Subscription">
    Your customer grants your application permission to charge their wallet up to a specified amount each billing period. This is a one-time approval that remains active until cancelled.
  </Step>

  <Step title="Application Charges Periodically">
    Your backend service charges the subscription when payment is due, without requiring any user interaction. You can charge up to the approved amount per period.
  </Step>

  <Step title="Smart Period Management">
    The spending limit automatically resets at the start of each new period. If you don't charge the full amount in one period, it doesn't roll over.
  </Step>

  <Step title="User Maintains Control">
    Customers can view and cancel their subscriptions anytime through their wallet, ensuring transparency and trust.
  </Step>
</Steps>

## Implementation Guide

### Architecture Overview

A complete subscription implementation requires both client and server components:

**Client-Side (Frontend):**

* User interface for subscription creation
* Create wallet requests and handle user responses

**Server-Side (Backend - Node.js):**

* CDP smart wallet for executing charges and revocations
* Scheduled jobs for periodic billing
* Database for subscription tracking
* Handlers for status updates
* Retry logic for failed charges

<Note>
  **CDP-Powered Backend**

  Base Subscriptions use **CDP (Coinbase Developer Platform) server wallets** for effortless backend management. The `charge()` and `revoke()` functions handle all transaction details automatically:

  * ✅ Automatic wallet management
  * ✅ Built-in transaction signing
  * ✅ Gas estimation and nonce handling
  * ✅ Optional paymaster support for gasless transactions

  Get CDP credentials from [CDP Portal](https://portal.cdp.coinbase.com/projects/api-keys).
</Note>

<Warning>
  **Security Requirements**

  To accept recurring payments, you need:

  1. CDP credentials (API key ID, secret, and wallet secret)
  2. Backend infrastructure (Node.js) to execute charges securely
  3. Database to store and manage subscription IDs
  4. Never expose CDP credentials in client-side code
</Warning>

### Setup: Create Your Subscription Owner Wallet

First, set up your CDP smart wallet that will act as the subscription owner:

```typescript backend/setup.ts expandable theme={null}
import { base } from '@base-org/account/node';

// Backend setup (Node.js only)
// Set CDP credentials as environment variables:
// CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
// PAYMASTER_URL (recommended for gasless transactions)

async function setupSubscriptionWallet() {
  try {
    // Create or retrieve your subscription owner wallet (CDP smart wallet)
    const wallet = await base.subscription.getOrCreateSubscriptionOwnerWallet({
      walletName: 'my-app-subscriptions' // Optional: customize wallet name
    });
    
    console.log('✅ Subscription owner wallet ready!');
    console.log(`Smart Wallet Address: ${wallet.address}`);
    console.log(`Wallet Name: ${wallet.walletName}`);
    
    // Make this address available to your frontend
    // Option 1: Store in database/config
    // Option 2: Expose via API endpoint
    // Option 3: Set as public environment variable (e.g., NEXT_PUBLIC_SUBSCRIPTION_OWNER)
    
    return wallet;
  } catch (error) {
    console.error('Failed to setup wallet:', error.message);
    throw error;
  }
}

// Run once at application startup
setupSubscriptionWallet();

// Optional: Provide an API endpoint for the frontend to fetch the address
export async function getSubscriptionOwnerAddress() {
  const wallet = await base.subscription.getOrCreateSubscriptionOwnerWallet();
  return wallet.address;
}
```

<Note>
  **Backend Only**: This setup runs in your Node.js backend with CDP credentials. The resulting wallet address is public and safe to share with your frontend for use in `subscribe()` calls.
</Note>

<Warning>
  **Keep CDP Credentials Private**: Never expose CDP credentials (API key, secrets) to the frontend. Only the subscription owner wallet address needs to be accessible to the frontend.
</Warning>

### Client-Side: Create Subscriptions

Users create subscriptions from your frontend application:

```tsx SubscriptionButton.tsx expandable theme={null}
import React, { useState } from 'react';
import { base } from '@base-org/account';

// This address comes from your backend setup (see setup.ts example above)
// You can fetch it from your backend or configure it as a public env var
const SUBSCRIPTION_OWNER_ADDRESS = "0xYourCDPWalletAddress"; // Replace with your actual address

export function SubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState('');
  
  const handleSubscribe = async () => {
    setLoading(true);
    
    try {
      // Create subscription
      const subscription = await base.subscription.subscribe({
        recurringCharge: "29.99",
        subscriptionOwner: SUBSCRIPTION_OWNER_ADDRESS, // Address from your backend CDP wallet
        periodInDays: 30,
        testnet: false
      });
      
      // Store subscription ID for future reference
      setSubscriptionId(subscription.id);
      console.log('Subscription created:', subscription.id);
      console.log('Payer:', subscription.subscriptionPayer);
      console.log('Amount:', subscription.recurringCharge);
      console.log('Period:', subscription.periodInDays, 'days');
      
      // Send subscription ID to your backend
      await saveSubscriptionToBackend(subscription.id, subscription.subscriptionPayer);
      
      setSubscribed(true);
      
    } catch (error) {
      console.error('Subscription failed:', error);
      alert('Failed to create subscription: ' + error.message);
    } fi