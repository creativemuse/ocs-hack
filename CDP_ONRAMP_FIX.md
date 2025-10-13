# CDP Onramp "Unauthorized Error" Fix

## Issue
Users were getting an "unauthorized" error when clicking "Add USDC" in the wallet dropdown, preventing them from funding their wallets via Coinbase Onramp.

## Root Cause
The `generateFundingUrl()` function in `lib/utils/funding.ts` was **not generating a valid One-Click-Buy URL** according to Coinbase's official requirements.

### What Was Wrong

According to [Coinbase Documentation](https://docs.cdp.coinbase.com/onramp-offramp/docs/api-configurations#one-click-buy-onramp-url), One-Click-Buy URLs must include:

**Required Parameters:**
- `sessionToken` (generated server-side with wallet addresses)
- `defaultAsset` (specific crypto asset to purchase)
- `presetFiatAmount` + `fiatCurrency` **OR** `presetCryptoAmount`

### Previous Implementation (INCORRECT ❌)

```typescript
// WRONG URL path
const baseUrl = 'https://pay.coinbase.com/buy/select-asset';

const params = new URLSearchParams({
  sessionToken: sessionToken,
  addresses: JSON.stringify(addresses),        // ❌ Should NOT be in URL
  assets: JSON.stringify(['USDC']),           // ❌ Should be defaultAsset (string)
  presetCryptoAmount: '10',                   // ❌ Missing fiatCurrency
  defaultPaymentMethod: 'APPLE_PAY'           // ⚠️ CARD is better (auto-upgrades)
});
```

**Problems:**
1. ❌ Wrong URL path: `/buy/select-asset` instead of `/buy`
2. ❌ Missing required `fiatCurrency` parameter
3. ❌ Missing required `defaultAsset` parameter
4. ❌ Incorrectly passing `addresses` in URL (already in session token)
5. ❌ Using `assets` array instead of `defaultAsset` string
6. ❌ Missing `defaultNetwork` parameter

### New Implementation (CORRECT ✅)

```typescript
// Correct URL path for One-Click-Buy
const baseUrl = 'https://pay.coinbase.com/buy';

const params = new URLSearchParams({
  sessionToken: sessionToken,              // ✅ Session token contains addresses
  defaultAsset: 'USDC',                   // ✅ Required: specific asset
  fiatCurrency: 'USD',                    // ✅ Required with presetFiatAmount
  presetFiatAmount: '10',                 // ✅ Amount in USD
  defaultPaymentMethod: 'CARD',           // ✅ Auto-upgrades to Apple Pay
  defaultNetwork: 'base'                  // ✅ Ensure Base network
});
```

## Why This Caused "Unauthorized" Error

When the URL format is incorrect, Coinbase's Onramp service:
1. Cannot properly validate the session token
2. Cannot match the session token to the request parameters
3. Rejects the request as unauthorized/invalid

The session token is generated with specific addresses and assets. When the URL parameters don't match the expected One-Click-Buy format, Coinbase cannot verify that the token is valid for that specific request.

## Changes Made

### 1. Updated `lib/utils/funding.ts`
- Fixed URL path from `/buy/select-asset` to `/buy`
- Added required `defaultAsset` parameter
- Added required `fiatCurrency` parameter
- Removed incorrect `addresses` from URL (they're in session token)
- Changed `assets` array to `defaultAsset` string
- Added `defaultNetwork` parameter
- Updated comments to explain One-Click-Buy requirements

### 2. Updated `ONRAMP_SETUP.md`
- Corrected One-Click-Buy URL format documentation
- Added link to official Coinbase documentation
- Updated parameter descriptions
- Clarified that addresses are in session token, not URL

## Testing

After deploying this fix:

1. **Connect your wallet** on the app
2. **Click "Add USDC"** in the wallet dropdown
3. You should be taken to the Coinbase Onramp payment screen (not an error)
4. The screen should show:
   - USDC as the asset to purchase
   - $10 USD as the amount
   - Base as the network
   - Card/Apple Pay as payment options

## Important Notes

### Session Token Still Required
The session token generation (`/api/session-token`) must still work correctly:
- Requires `CDP_API_KEY` and `CDP_API_SECRET` (you have these ✅)
- Requires proper CORS configuration (you have this ✅)
- Session tokens expire after ~2 minutes (this is normal)

### One-Click-Buy Benefits
With the correct URL format:
- Users go **directly to the payment screen**
- All options are pre-filled (asset, amount, network)
- Works for both Coinbase users and guests
- Auto-detects Apple Pay availability

## Verification

The fix is complete when:
- ✅ URL path is `https://pay.coinbase.com/buy`
- ✅ URL includes `defaultAsset`, `fiatCurrency`, and `presetFiatAmount`
- ✅ URL does NOT include `addresses` or `assets` array
- ✅ Users can click "Add USDC" without getting unauthorized errors
- ✅ Coinbase Onramp loads with pre-filled USDC purchase

## Reference

- [Coinbase One-Click-Buy Documentation](https://docs.cdp.coinbase.com/onramp-offramp/docs/api-configurations#one-click-buy-onramp-url)
- [Session Token API](https://docs.cdp.coinbase.com/onramp-offramp/docs/api-configurations#getting-a-session-token)
- [OnchainKit Fund Components](https://onchainkit.xyz/fund/fund-button)

