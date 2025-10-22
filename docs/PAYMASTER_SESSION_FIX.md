# Paymaster "Session Ended" Fix

## Problem
Users were getting "Session ended" errors when trying to execute sponsored transactions after ~2 minutes.

## Root Cause
The `paymaster` config property in `OnchainKitProvider` was pointing to a session-based URL that required periodic token refresh. Session tokens expire after 2 minutes, causing transactions to fail.

## Solution
✅ **Removed** the session-based `paymaster` URL from `rootProvider.tsx`

OnchainKit automatically uses the CDP Paymaster when you have:
- `apiKey`: Your OnchainKit API key
- `projectId`: Your CDP Project ID  

These are already configured in your `.env.local`:
```
NEXT_PUBLIC_ONCHAINKIT_API_KEY=hRylc180nVLV1BADxHG9JF3LIIM5WDcu
NEXT_PUBLIC_CDP_PROJECT_ID=5b09d242-5390-4db3-866f-bfc2ce575821
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/hRylc180nVLV1BADxHG9JF3LIIM5WDcu
```

## How It Works Now

1. **OnchainKitProvider** (in `rootProvider.tsx`):
   - Uses `apiKey` and `projectId` for automatic paymaster support
   - No separate paymaster URL needed
   - No session token management required

2. **SponsoredTransaction** component:
   - Uses `<TransactionSponsor />` to enable gas sponsorship
   - Automatically connects to CDP Paymaster
   - Works indefinitely without session expiration

## Important: Configure Contract Allowlist

⚠️ **For security, you MUST configure your contract allowlist on the CDP Dashboard:**

1. Go to: https://portal.cdp.coinbase.com/products/bundler-and-paymaster
2. Navigate to your project: `5b09d242-5390-4db3-866f-bfc2ce575821`
3. Add these contracts to the allowlist:
   
   **Your TriviaBattle Contract:**
   - Address: `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`
   - Network: Base Mainnet
   - Functions: `joinBattle`, `joinTrialBattle`, `submitScore`, `submitTrialScore`
   
   **USDC Token Contract (for approvals):**
   - Address: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`
   - Network: Base Mainnet
   - Functions: `approve`

4. Without a contract allowlist, your paymaster will only sponsor up to **$1 total**

## Testing the Fix

1. Connect your wallet
2. Wait more than 2 minutes
3. Try to execute a sponsored transaction (join game, submit score)
4. Should work without "Session ended" error ✅

## Transaction Preview Issue

If you see "Transaction preview unavailable - Unable to estimate asset changes":
- This is often just a warning
- The transaction should still execute successfully
- It happens when the simulation can't predict the exact outcome
- As long as the transaction completes, you're good!

## Monitoring Paymaster Usage

Check your paymaster usage at:
https://portal.cdp.coinbase.com/products/bundler-and-paymaster

Monitor:
- Total gas sponsored
- Transaction count
- Spending limits
- Contract allowlist status
