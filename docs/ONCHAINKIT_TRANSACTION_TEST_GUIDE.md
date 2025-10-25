# OnchainKit Transaction Test Guide

## ✅ Completed Updates

### 1. OnchainKitProvider Configuration
- ✅ Updated to use `NEXT_PUBLIC_CDP_API_KEY` (matches OnchainKit docs)
- ✅ Moved paymaster config to top of config object
- ✅ Maintains backward compatibility with legacy variable names

### 2. Transaction Component Structure
- ✅ Updated to use proper OnchainKit Transaction pattern with children:
  - `<TransactionButton />` - Handles transaction initiation
  - `<TransactionSponsor />` - Shows sponsorship information
  - `<TransactionStatus />` - Contains status components:
    - `<TransactionStatusLabel />` - Shows current status
    - `<TransactionStatusAction />` - Provides status actions

### 3. Environment Variables
- ✅ Updated documentation to prioritize `NEXT_PUBLIC_CDP_API_KEY`
- ✅ Marked legacy `NEXT_PUBLIC_ONCHAINKIT_API_KEY` as deprecated

## Testing Steps

### 1. Environment Setup
Ensure your `.env.local` has:
```bash
NEXT_PUBLIC_CDP_API_KEY=hRylc180nVLV1BADxHG9JF3LIIM5WDcu
NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/hRylc180nVLV1BADxHG9JF3LIIM5WDcu
```

### 2. CDP Dashboard Configuration
Add these contracts to your paymaster allowlist:

**USDC Contract (Base Mainnet):** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Function: `approve(address,uint256)`

**TriviaBattle Contract:** `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`
- Function: `joinBattle()`

### 3. Paymaster Limits
Set appropriate limits in CDP Dashboard:
- Per User Operation Limit: `$2-3 USD`
- Max UserOperations: `10`
- Limit Cycle: `Daily`

### 4. Test Transaction Flow

1. **Restart Development Server:**
   ```bash
   npm run dev
   ```

2. **Connect Wallet with USDC but minimal ETH**

3. **Navigate to Game Entry Page**

4. **Select "Paid Mode"**

5. **Click "Start Paid Game"**

6. **Expected Behavior:**
   - ✅ Transaction should show "Sponsored" status
   - ✅ No ETH gas fees required
   - ✅ Only 1 USDC entry fee charged
   - ✅ Transaction completes successfully
   - ✅ TransactionSponsor component shows sponsorship info
   - ✅ TransactionStatus shows proper status updates

### 5. Verify Paymaster Integration

Test the curl request to verify allowlist (replace YOUR_API_KEY with your actual key):
```bash
curl -s https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "method": "pm_getPaymasterStubData", "params": [{"callData": "0x095ea7b3000000000000000000000000c166a6fb38636e8430d6a2efb7a601c22665942500000000000000000000000000000000000000000000000000000000000f4240","callGasLimit":"0x0","initCode":"0x","maxFeePerGas":"0x0","maxPriorityFeePerGas":"0x0","nonce":"0x0","paymasterAndData":"0x","preVerificationGas":"0x0","sender":"YOUR_WALLET_ADDRESS","signature":"0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c00000000000000000000000000000000000000000000000000000000000000","verificationGasLimit":"0x0"},"0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789","0x2105",{}],"jsonrpc": "2.0"}'
```

**Expected Response:** Should return paymaster stub data instead of "not in allowlist" error.

**Note:** The callData above is for USDC approve() function calling the TriviaBattle contract with 1 USDC (1000000 wei).

## Troubleshooting

### If transactions still fail:

1. **Check Browser Console** for detailed error messages
2. **Verify Environment Variables** are loaded correctly
3. **Check CDP Dashboard** for transaction attempts in Analytics
4. **Ensure Contract Allowlist** includes both addresses
5. **Verify Paymaster Limits** haven't been exceeded

### Common Issues:

- **"request denied - called address not in allowlist"** → Add missing contract to allowlist
- **"Transaction likely to fail"** → Check paymaster configuration
- **"Insufficient funds"** → Ensure paymaster has sufficient balance

## Key Changes Made

1. **OnchainKitProvider** now uses `NEXT_PUBLIC_CDP_API_KEY`
2. **Transaction component** follows proper OnchainKit pattern with children
3. **Environment variables** updated to match OnchainKit documentation
4. **Paymaster configuration** properly structured in provider config

## Success Criteria

✅ Transactions show "Sponsored" status  
✅ No ETH gas fees charged to users  
✅ Only USDC entry fee deducted  
✅ Proper status updates displayed  
✅ No "not in allowlist" errors  
✅ CDP Dashboard shows sponsored transactions  

---

**Status:** Ready for testing  
**Date:** 2025-01-13  
**Next Steps:** Test the transaction flow and verify paymaster sponsorship works correctly
