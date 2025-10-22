# Transaction Error Fix: Empty Error Object {}

## Problem
Getting `Error: Transaction failed: {}` when trying to execute sponsored transactions. The error object is empty, providing no useful debugging information.

## Root Cause
**The paymaster is rejecting transactions without providing detailed error messages.** This happens when:

1. **Contracts are not in the paymaster allowlist** ⚠️ (MOST COMMON)
2. Paymaster has insufficient funds
3. Smart wallet doesn't support required capabilities
4. Bundler/Paymaster service is down

## Solution Implemented

### 1. Enhanced Error Handling (GameEntry.tsx)
Added special detection for empty error objects with helpful diagnostics:

```typescript
// Check if error object is empty - this often means paymaster/bundler rejection
const isEmptyError = !status.statusData || Object.keys(status.statusData).length === 0;

if (isEmptyError) {
  console.error('⚠️ Empty error object detected - likely paymaster/bundler issue');
  console.error('Common causes:');
  console.error('1. Contracts not in paymaster allowlist');
  console.error('2. Paymaster out of funds');
  console.error('3. Smart wallet capabilities not supported');
  
  // Provide helpful error message with contract addresses
  const paymasterError: TransactionError = {
    code: 'PAYMASTER_ERROR',
    message: 'Transaction rejected by paymaster',
    userMessage: 'Unable to sponsor transaction. Please ensure contracts are allowlisted in CDP Dashboard.',
    recoverable: true,
    retryable: false,
    details: {
      suggestion: 'Check CDP Dashboard > Paymaster > Contract Allowlist',
      contracts: [
        'USDC: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        `TriviaBattle: ${TRIVIA_CONTRACT_ADDRESS}`
      ],
      link: 'https://portal.cdp.coinbase.com/products/bundler-and-paymaster'
    }
  };
}
```

### 2. Better Console Logging
Now logs full transaction status for debugging:
```typescript
console.error('Transaction failed:', status.statusData);
console.error('Full transaction status:', JSON.stringify(status, null, 2));
```

## How to Fix the Actual Issue

### ⚠️ CRITICAL: Add Contracts to Paymaster Allowlist

**This is the #1 reason for empty error objects!**

1. **Go to CDP Dashboard:**
   - https://portal.cdp.coinbase.com/products/bundler-and-paymaster

2. **Navigate to your project:**
   - Project ID: `5b09d242-5390-4db3-866f-bfc2ce575821`

3. **Add these contracts to the allowlist:**

   **Contract 1: USDC Token**
   - Address: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`
   - Network: Base Mainnet (Chain ID: 8453)
   - Functions: `approve`
   - Reason: Users need to approve USDC spending for the game

   **Contract 2: TriviaBattle Game Contract**
   - Address: `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`
   - Network: Base Mainnet (Chain ID: 8453)
   - Functions: `joinBattle`, `joinTrialBattle`, `submitScore`, `submitTrialScore`
   - Reason: Main game contract that processes entry fees and scores

4. **Set spending limits (recommended):**
   - Daily limit: $100 (or appropriate for your use case)
   - Per-transaction limit: $5
   - This prevents unexpected high costs

5. **Save and wait:**
   - Changes may take a few minutes to propagate
   - Test with a small transaction first

### Without an Allowlist
⚠️ **Your paymaster will only sponsor up to $1 total** for security reasons!

## Testing the Fix

### 1. Check Browser Console
After the fix, you should see detailed error messages:
```
⚠️ Empty error object detected - likely paymaster/bundler issue
Common causes:
1. Contracts not in paymaster allowlist
2. Paymaster out of funds  
3. Smart wallet capabilities not supported
```

### 2. Check User-Facing Error
Users will now see:
```
Unable to sponsor transaction. Please ensure contracts are allowlisted in CDP Dashboard.
```

Instead of just:
```
Transaction failed
```

### 3. Verify Allowlist is Working
1. Connect your Smart Wallet
2. Try to start a paid game
3. If allowlist is correct: transaction succeeds ✅
4. If allowlist is missing: you get the new helpful error message

## Additional Debugging

### Check Paymaster Configuration
In `rootProvider.tsx`:
```typescript
<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
  projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
  chain={base}
  config={{
    // No paymaster URL needed - uses projectId automatically
    // ✅ Correct configuration
  }}
>
```

### Verify Environment Variables
```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=hRylc180nVLV1BADxHG9JF3LIIM5WDcu
NEXT_PUBLIC_CDP_PROJECT_ID=5b09d242-5390-4db3-866f-bfc2ce575821
```

### Check Transaction Calls
In `lib/transaction/paidGameCalls.ts`:
```typescript
[
  // Step 1: Approve USDC
  {
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    abi: USDC_ABI,
    functionName: 'approve',
    args: [TRIVIA_CONTRACT_ADDRESS, entryFeeWei],
  },
  // Step 2: Join battle
  {
    address: '0x231240B1d776a8F72785FE3707b74Ed9C3048B3a',
    abi: TRIVIA_ABI,
    functionName: 'joinBattle',
    args: [],
  },
]
```

Both contracts must be allowlisted for this to work!

## Expected Behavior After Fix

### Before Fix:
```
Error: Transaction failed: {}
[No useful information]
```

### After Fix:
```
⚠️ Empty error object detected - likely paymaster/bundler issue
Common causes:
1. Contracts not in paymaster allowlist  ← Points you to the solution!
2. Paymaster out of funds
3. Smart wallet capabilities not supported

User sees: "Unable to sponsor transaction. Please ensure contracts are allowlisted in CDP Dashboard."
With link to: https://portal.cdp.coinbase.com/products/bundler-and-paymaster
And contract addresses to add
```

## Quick Checklist

- [ ] Add USDC contract to allowlist (0x833589fcd6edb6e08f4c7c32d4f71b54bda02913)
- [ ] Add TriviaBattle contract to allowlist (0x231240B1d776a8F72785FE3707b74Ed9C3048B3a)
- [ ] Set appropriate spending limits
- [ ] Save changes in CDP Dashboard
- [ ] Wait 2-3 minutes for propagation
- [ ] Test with a small transaction
- [ ] Monitor paymaster usage in dashboard

## Related Files Modified

1. **components/game/GameEntry.tsx**
   - Enhanced error handling for empty error objects
   - Better console logging
   - User-friendly error messages with actionable steps

2. **app/rootProvider.tsx** (from previous fix)
   - Removed session-based paymaster URL
   - Now uses automatic CDP Paymaster

3. **components/transaction/SponsoredTransaction.tsx** (from previous fix)
   - Simplified to use built-in paymaster support

## Summary

The empty error object `{}` is almost always caused by **missing contract allowlist configuration** in the CDP Dashboard. The fix provides:

1. ✅ Clear error detection
2. ✅ Helpful console logs for developers
3. ✅ Actionable error messages for users
4. ✅ Direct links to the CDP Dashboard
5. ✅ Contract addresses ready to copy-paste

**Next Step:** Add the contracts to your paymaster allowlist! 🚀
