# ERC-20 Gas Payment Implementation

This document describes the implementation of ERC-20 gas payment using Viem's account abstraction utilities, allowing users to pay gas fees in USDC instead of ETH.

## Overview

The implementation uses Viem's `createBundlerClient` and account abstraction utilities to enable users with smart accounts to pay gas fees in USDC (ERC-20 token) when joining paid games.

## Architecture

### Components

1. **`useBundlerClient.ts`** - Creates a bundler client for account abstraction operations
2. **`usePaidGameEntryWithERC20Gas.ts`** - Handles paid game entry with ERC-20 gas payment
3. **`usePaidGameEntry.ts`** - Main hook that routes to either ERC-20 gas payment (smart accounts) or ETH gas payment (EOA)

### Flow

1. **Smart Account Detection**: `useAccountCapabilities` detects if the wallet supports paymaster service
2. **Bundler Client Setup**: `useBundlerClient` creates a bundler client using the connected wallet address
3. **ERC-20 Gas Payment**: 
   - Checks if paymaster approval is needed (minimum $1 USDC threshold)
   - Batches three calls:
     - Approve paymaster for ERC-20 gas (if needed)
     - Approve contract for entry fee
     - Call `enterGame()` function
   - Sends batched transaction with ERC-20 gas payment capability

## Key Features

- **Batched Transactions**: All three operations (paymaster approval, contract approval, game entry) are batched into a single UserOperation
- **Automatic Approval**: Checks current paymaster allowance and only adds approval if below $1 threshold
- **ERC-20 Gas Payment**: Users pay gas fees in USDC, no ETH required
- **Fallback Support**: EOA accounts still use standard ETH gas payment

## Configuration

### Environment Variables

```bash
# Paymaster & Bundler endpoint (from CDP Dashboard)
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/your_api_key

# Base RPC URL
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

### Paymaster Address

The paymaster address is hardcoded in `usePaidGameEntryWithERC20Gas.ts`:
```typescript
const PAYMASTER_ADDRESS = '0x2FAEB0760D4230Ef2aC21496Bb4F0b47D634FD4c';
```

This is the CDP Paymaster address for Base. Update if using a different paymaster.

## API Notes

The exact API for `sendUserOperation` with paymaster may vary based on Viem version. The current implementation uses:

```typescript
await bundlerClient.sendUserOperation({
  calls,
  paymaster: {
    type: 'ERC20',
    token: USDC_CONTRACT_ADDRESS,
  },
});
```

If you encounter API errors, you may need to adjust the paymaster configuration format based on your Viem version. Check the [Viem documentation](https://viem.sh/docs/account-abstraction) for the latest API.

## Usage

The hook is used automatically in `GameEntry.tsx`:

```typescript
const { 
  joinGameUniversal, 
  result, 
  error, 
  isSmartAccount, 
  isEOA,
  isLoading 
} = usePaidGameEntry();

// Automatically uses ERC-20 gas payment for smart accounts
await joinGameUniversal();
```

## Benefits

1. **No ETH Required**: Users only need USDC to play
2. **Batched Operations**: Single transaction instead of multiple
3. **Better UX**: Gasless experience for smart account users
4. **Cost Efficient**: Single UserOperation is cheaper than multiple transactions

## Troubleshooting

### Bundler Client Not Ready

- Ensure `NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT` is set
- Check that wallet is connected
- Verify paymaster is configured in CDP Dashboard

### Paymaster Approval Errors

- Check USDC balance (needs enough for gas + entry fee)
- Verify paymaster address is correct
- Ensure paymaster allowlist includes USDC contract and TriviaBattle contract

### API Errors

- Verify Viem version compatibility
- Check bundler client API documentation
- May need to adjust paymaster configuration format

## Future Improvements

- Dynamic paymaster address detection
- Better error messages for paymaster failures
- Support for other ERC-20 tokens (beyond USDC)
- Proxy endpoint for paymaster URL (security)

