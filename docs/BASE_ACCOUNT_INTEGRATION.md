# Base Account Integration

This document describes the Base Account integration alongside CDP Embedded Wallets.

## Overview

The app now supports both wallet types:

1. **Base Account**: Users can connect with their existing Base Account
2. **Embedded Wallets**: Users can create/use CDP Embedded Wallets via OnchainKit

Both wallet types are supported through wagmi connectors and work seamlessly with account abstraction features.

## Implementation Details

### Wagmi Configuration

The wagmi config in `app/rootProvider.tsx` includes both connectors:

```typescript
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Base Account connector for existing Base users
    baseAccount({
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'BEAT ME',
    }),
    // Coinbase Wallet connector (includes embedded wallets via OnchainKit)
    coinbaseWallet({
      appName: 'BEAT ME',
      preference: 'smartWalletOnly',
    }),
  ],
  // ...
});
```

### useBundlerClient Hook

The `useBundlerClient` hook works with both wallet types:

- **Base Account**: Uses the account from the Base Account connector
- **Embedded Wallets**: Uses the account from OnchainKit's embedded wallet

Both wallet types are converted to Coinbase Smart Accounts for account abstraction operations.

### How It Works

1. User connects with either wallet type via wagmi
2. `useBundlerClient` detects the connected wallet through `useWalletClient()`
3. The wallet's account is used to create a Coinbase Smart Account via `toCoinbaseSmartAccount()`
4. The smart account is used to create a bundler client for account abstraction operations

### Error Handling

The hook includes enhanced error logging that shows:
- Connected wallet address
- Connector name (Base Account vs Coinbase Wallet)
- Account availability status
- Detailed error messages

## Environment Variables

Ensure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_APP_NAME="BEAT ME"  # Used for Base Account connector
NEXT_PUBLIC_CDP_API_KEY=your_api_key
NEXT_PUBLIC_CDP_PROJECT_ID=your_project_id
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=your_paymaster_endpoint
```

## Dependencies

- `@base-org/account`: Already installed as a transitive dependency via `@wagmi/connectors`
- `wagmi`: Already configured with both connectors
- `@coinbase/onchainkit`: Handles embedded wallet UI and management

## Testing

1. **Base Account**: Connect using the Base Account option in the wallet modal
2. **Embedded Wallet**: Connect using the Coinbase Wallet option (creates embedded wallet if needed)
3. Both should work with `useBundlerClient` for account abstraction operations

## Troubleshooting

### Base Account Not Appearing

- Verify `@base-org/account` is available (it's a transitive dependency)
- Check that the Base Account connector is in the wagmi config
- Ensure you're on Base network

### useBundlerClient Not Working

- Check that `walletClient.account` is available
- Verify the wallet is connected via wagmi
- Check console for detailed error messages including connector name

## Differences from CDPHooksProvider Approach

This implementation uses **OnchainKit** instead of the lower-level `CDPHooksProvider` approach:

- **OnchainKit**: Higher-level abstraction, includes UI components, handles wallet management
- **CDPHooksProvider**: Lower-level, requires manual implementation of wallet UI and state management

For this app, OnchainKit is the better choice as it provides:
- Built-in wallet UI components
- Automatic embedded wallet management
- Integration with existing Coinbase Wallet infrastructure
- Support for both Base Account and embedded wallets through wagmi connectors

