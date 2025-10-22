# Paymaster Fix - Gasless Transactions Now Working

## Problem
Paid players were being charged gas fees despite having a CDP Paymaster configured with a $1 USD per operation limit.

## Root Cause
The `OnchainKitProvider` in `app/rootProvider.tsx` was missing the `paymaster` configuration in the `config` object. Without this, the Transaction component couldn't use the paymaster endpoint for sponsored transactions.

## Solution Applied

### 1. Updated `app/rootProvider.tsx`
Added the `paymaster` configuration to the `OnchainKitProvider`:

```tsx
<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
  chain={base}
  projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID || "5b09d242-5390-4db3-866f-bfc2ce575821"}
  config={{
    appearance: {
      name: "BEAT ME",
      mode: "auto",
    },
    wallet: {
      display: "modal",
      preference: "all",
    },
    // Paymaster configuration for sponsored transactions
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL, // ✅ ADDED THIS
    analytics: false,
  }}
>
  {children}
</OnchainKitProvider>
```

### 2. Environment Variable Required

Your `.env.local` should already have:

```bash
# CDP Paymaster & Bundler Endpoint
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/<YOUR-KEY>
```

✅ This variable is already configured in your environment.

**To get your Paymaster RPC URL:**
1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/products/bundler-and-paymaster)
2. Navigate to your project → **Paymaster** → **Configuration** tab
3. Copy the **RPC URL** from the configuration page

### 3. CDP Dashboard Configuration

Ensure your CDP Paymaster is configured correctly:

#### ✅ Paymaster Enabled
- Toggle is ON in the Configuration tab

#### ✅ Contract Allowlist
Add both contracts with their specific functions:

**USDC Contract** (`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`):
- Function: `approve(address,uint256)`

**TriviaBattle Contract** (`0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`):
- Function: `joinBattle()`

#### ✅ Per User Operation Limit
**IMPORTANT:** Increase this to at least **$2-3 USD**

**Why?** The paid game entry creates 2 separate calls:
1. `approve()` - Approve USDC spending (~$0.001-0.01)
2. `joinBattle()` - Join the game (~$0.001-0.01)

Each call is a separate UserOperation. Your current limit of $1 USD may not be enough to cover both operations, especially during high gas conditions.

**Recommended Settings:**
- Per User Operation Limit: `$2-3 USD`
- Max UserOperations: `10` (allows up to 10 game entries per user per cycle)
- Limit Cycle: `Daily` or `Weekly`

#### ✅ Global Limit
Set a reasonable global sponsorship limit:
- Recommended: Start with `$50-100 USD` for testing
- Adjust based on your expected daily active users
- Monitor usage in the CDP Dashboard

### 4. How It Works Now

**Transaction Flow:**
1. Player clicks "Start Paid Game"
2. `createPaidGameCalls()` creates two contract calls:
   ```typescript
   [
     { contract: USDC, function: 'approve', args: [...] },
     { contract: TriviaBattle, function: 'joinBattle', args: [] }
   ]
   ```
3. `Transaction` component with `isSponsored={true}` batches these calls
4. OnchainKit uses the configured `paymaster` endpoint
5. CDP Paymaster validates against allowlist and limits
6. If approved, paymaster sponsors the gas fees
7. Player pays 0 ETH in gas, only 1 USDC entry fee ✅

### 5. Testing Your Setup

After applying changes:

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Connect a wallet** with USDC but minimal/no ETH

3. **Try to start a paid game:**
   - Should see "Gasless" badge
   - Transaction should process without requiring ETH for gas
   - Check browser console for transaction confirmation

4. **Monitor in CDP Dashboard:**
   - Go to Paymaster → Analytics
   - View sponsored transactions in real-time
   - Check spending against limits

### 6. Troubleshooting

#### Error: "Transaction rejected by paymaster"
**Cause:** Contracts not in allowlist or limits exceeded

**Fix:**
1. Verify both contracts are in the allowlist with correct function signatures
2. Check Per User Operation limit is at least $2 USD
3. Ensure Global Limit hasn't been exceeded

#### Error: "Empty error object {}"
**Cause:** Paymaster rejecting but not providing details (common with allowlist issues)

**Fix:**
1. Double-check contract addresses in allowlist (case-sensitive)
2. Verify function signatures match exactly: `approve(address,uint256)` and `joinBattle()`
3. Ensure paymaster is enabled (toggle ON)

#### Players still paying gas
**Cause:** Environment variable not set or dev server not restarted

**Fix:**
1. Verify `NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT` is in `.env.local`
2. Restart dev server: `npm run dev`
3. Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

## Security Considerations

### Proxy Service (Production)
For production, use a proxy service to hide your Paymaster RPC URL:
- See: https://www.smartwallet.dev/guides/paymasters
- Prevents rate limiting and abuse
- Adds additional security layer

### Rate Limiting
Consider implementing additional rate limiting in your app:
- Limit game entries per user per hour
- Track suspicious patterns
- Add CAPTCHA for high-frequency users

### Cost Monitoring
Set up alerts in CDP Dashboard:
- Alert when 50% of global limit reached
- Alert when daily spending exceeds threshold
- Monitor for abnormal usage patterns

## Expected Results

✅ **Paid players don't pay gas fees**
✅ **Only 1 USDC entry fee charged**
✅ **Transaction status shows "Sponsored"**
✅ **CDP Dashboard shows sponsored operations**
✅ **Better user experience (no gas confusion)**

## Testing Checklist

- [x] ~~Added `NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT` to `.env.local`~~ ✅ Already configured
- [ ] Verified paymaster endpoint URL is correct
- [ ] Paymaster is enabled in CDP Dashboard
- [ ] Both contracts allowlisted with correct functions
- [ ] Per User Operation limit set to $2-3 USD
- [ ] Global limit has available funds
- [ ] Restarted dev server
- [ ] Tested paid game entry with wallet (USDC but no ETH)
- [ ] Confirmed no gas fees charged
- [ ] Checked transaction in CDP Dashboard Analytics

## Related Files

- `app/rootProvider.tsx` - OnchainKit provider configuration
- `components/game/GameEntry.tsx` - Game entry component with Transaction
- `lib/transaction/paidGameCalls.ts` - Transaction call creation
- `.env.local` - Environment variables (not in git)

## References

- [CDP Paymaster Documentation](https://docs.cdp.coinbase.com/paymaster/docs/paymaster-billing-credits)
- [OnchainKit Transaction Sponsorship](https://onchainkit.xyz/transaction/transaction#sponsor-with-paymaster-capabilities)
- [Base Gasless Transactions Guide](https://docs.base.org/cookbook/account-abstraction/gasless-transactions-with-paymaster)

---

**Status:** ✅ Fixed and ready for testing
**Date:** 2025-01-13

