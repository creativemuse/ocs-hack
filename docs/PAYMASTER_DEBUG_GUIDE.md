# Paymaster Transaction Debug Guide

## ✅ Contract Addresses (VERIFIED)

**USDC Contract (Base Mainnet):**
```
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

**TriviaBattle Contract:**
```
0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13
```

## 🔍 Debug Features Added

### 1. Environment Variable Logging
When the GameEntry component loads, it will log:
- ✅ CDP API Key existence and length
- ✅ Paymaster endpoint URL
- ✅ CDP Project ID
- ✅ Chain ID (should be 8453 for Base)
- ✅ Contract addresses

### 2. Paymaster Connection Test
When wallet connects, automatically tests:
- ✅ Paymaster endpoint connectivity
- ✅ Contract allowlist status
- ✅ USDC approve() function allowlist

### 3. Enhanced Transaction Error Logging
Every transaction status update logs:
- ✅ Status name (success/error/pending)
- ✅ Full error details
- ✅ Error type and keys
- ✅ Specific error messages

## 🧪 Testing Steps

### Step 1: Open Browser Console
1. Open your app in browser
2. Press F12 to open DevTools
3. Go to Console tab
4. Clear console (Ctrl+L or Cmd+K)

### Step 2: Connect Wallet
Look for these logs:
```
🔍 Environment Configuration Check:
- CDP_API_KEY exists: true
- CDP_API_KEY length: [should be > 0]
- PAYMASTER_ENDPOINT exists: true
- PAYMASTER_ENDPOINT: https://api.developer.coinbase.com/rpc/v1/base/[your-key]
- CDP_PROJECT_ID: [your-project-id]
- Chain ID: 8453
- USDC Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- TriviaBattle Address: 0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13
```

### Step 3: Wait for Paymaster Test
Look for these logs:
```
🧪 Testing paymaster connection...
✅ Paymaster connection test: { result: "0x2105", ... }
🧪 Testing contract allowlist...
✅ Contract allowlist test: { result: { ... } }
```

**OR if there's an error:**
```
❌ USDC Contract NOT in paymaster allowlist!
Please add 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 to your CDP Dashboard
```

### Step 4: Try Transaction
Click "Start Paid Game" and watch for:
```
🔍 Transaction Status Update:
- Status Name: [init/pending/success/error]
- Status Data: { ... }
- Full Status: { ... }
```

## 🚨 Common Error Patterns

### Error 1: Contract Not in Allowlist
**Console Output:**
```
❌ USDC Contract NOT in paymaster allowlist!
```

**Solution:**
1. Go to [CDP Dashboard](https://portal.cdp.coinbase.com/products/bundler-and-paymaster)
2. Click "Contract Allowlist" tab
3. Add both contracts:
   - `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` with function `approve(address,uint256)`
   - `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13` with function `joinBattle()`

### Error 2: Paymaster Out of Funds
**Console Output:**
```
❌ Transaction Error Detected
- Error Message: "insufficient funds" or "paymaster balance"
```

**Solution:**
1. Go to CDP Dashboard
2. Check Paymaster balance
3. Add funds if needed

### Error 3: API Key Issues
**Console Output:**
```
🔍 Environment Configuration Check:
- CDP_API_KEY exists: false
```

**Solution:**
1. Check `.env.local` file has `NEXT_PUBLIC_CDP_API_KEY`
2. Restart dev server: `npm run dev`
3. Clear browser cache

### Error 4: Wrong Network
**Console Output:**
```
- Chain ID: [not 8453]
```

**Solution:**
- Ensure you're on Base mainnet (chain ID 8453)
- Check wallet network settings

## 📋 Pre-Flight Checklist

Before testing transactions, verify:

- [ ] `.env.local` has all required variables:
  - `NEXT_PUBLIC_CDP_API_KEY`
  - `NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT`
  - `NEXT_PUBLIC_CDP_PROJECT_ID`
- [ ] CDP Dashboard Contract Allowlist includes:
  - USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - TriviaBattle: `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`
- [ ] Paymaster has sufficient balance
- [ ] Paymaster limits are set:
  - Per User Operation: $2-3 USD
  - Max Operations: 10
  - Cycle: Daily
- [ ] Wallet connected to Base mainnet
- [ ] Wallet has 1+ USDC balance
- [ ] Dev server restarted after env changes

## 🔧 Manual Paymaster Test

Test your paymaster configuration with curl:

```bash
# Replace YOUR_API_KEY with your actual key
# Replace YOUR_WALLET_ADDRESS with your wallet address

curl -s https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "method": "pm_getPaymasterStubData",
    "params": [{
      "callData": "0x095ea7b3000000000000000000000000c166a6fb38636e8430d6a2efb7a601c22665942500000000000000000000000000000000000000000000000000000000000f4240",
      "callGasLimit": "0x0",
      "initCode": "0x",
      "maxFeePerGas": "0x0",
      "maxPriorityFeePerGas": "0x0",
      "nonce": "0x0",
      "paymasterAndData": "0x",
      "preVerificationGas": "0x0",
      "sender": "YOUR_WALLET_ADDRESS",
      "signature": "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c00000000000000000000000000000000000000000000000000000000000000",
      "verificationGasLimit": "0x0"
    }, "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789", "0x2105", {}],
    "jsonrpc": "2.0"
  }'
```

**Expected Success Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "paymasterAndData": "0x...",
    "preVerificationGas": "0x...",
    "verificationGasLimit": "0x...",
    "callGasLimit": "0x..."
  }
}
```

**Error Response (Not in Allowlist):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "request denied - called address not in allowlist"
  }
}
```

## 📊 What to Share for Support

If you still have issues, share these console logs:

1. **Environment Check** (first log block)
2. **Paymaster Connection Test** (second log block)
3. **Transaction Error** (full error object)
4. **CDP Dashboard Screenshot** showing:
   - Contract Allowlist
   - Paymaster Balance
   - Paymaster Limits

## 🎯 Success Indicators

When everything works correctly, you'll see:

```
🔍 Environment Configuration Check:
- CDP_API_KEY exists: true ✅
- PAYMASTER_ENDPOINT exists: true ✅

🧪 Testing paymaster connection...
✅ Paymaster connection test: { result: "0x2105" } ✅

🧪 Testing contract allowlist...
✅ Contract allowlist test: { result: { ... } } ✅

🔍 Transaction Status Update:
- Status Name: success ✅
✅ Paid game transaction successful! ✅
```

---

**Last Updated:** 2025-01-14
**Status:** Debug features active
**Next Steps:** Test transaction and review console logs

