# Quick Debug Reference Card

## 🎯 Contract Addresses (Copy-Paste Ready)

### USDC (Base Mainnet)
```
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```
**Function:** `approve(address,uint256)`

### TriviaBattle
```
0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13
```
**Function:** `joinBattle()`

## 🔧 Quick Test Commands

### Test Paymaster Connection
```bash
curl -s https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "method": "eth_chainId", "params": [], "jsonrpc": "2.0"}'
```

### Test Contract Allowlist
```bash
curl -s https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "method": "pm_getPaymasterStubData",
    "params": [{
      "callData": "0x095ea7b3000000000000000000000000c166a6fb38636e8430d6a2efb7a601c22665942500000000000000000000000000000000000000000000000000000000000f4240",
      "sender": "YOUR_WALLET_ADDRESS",
      "nonce": "0x0"
    }],
    "jsonrpc": "2.0"
  }'
```

## 📊 Console Log Checklist

### ✅ Good Logs (Everything Working)
```
🔍 Environment Configuration Check:
- CDP_API_KEY exists: true ✅
- PAYMASTER_ENDPOINT exists: true ✅

🧪 Testing paymaster connection...
✅ Paymaster connection test: { result: "0x2105" }

🧪 Testing contract allowlist...
✅ Contract allowlist test: { result: { ... } }

🔍 Transaction Status Update:
- Status Name: success
✅ Paid game transaction successful!
```

### ❌ Bad Logs (Need to Fix)
```
❌ USDC Contract NOT in paymaster allowlist!
❌ Paymaster connection test failed
- CDP_API_KEY exists: false
- PAYMASTER_ENDPOINT exists: false
```

## 🚨 Quick Fixes

### Fix 1: Contract Not in Allowlist
1. Go to: https://portal.cdp.coinbase.com/products/bundler-and-paymaster
2. Click "Contract Allowlist"
3. Add both contracts above

### Fix 2: Missing Environment Variables
1. Check `.env.local` has:
   ```
   NEXT_PUBLIC_CDP_API_KEY=your_key
   NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base/your_key
   NEXT_PUBLIC_CDP_PROJECT_ID=your_project_id
   ```
2. Restart: `npm run dev`

### Fix 3: Wrong Network
- Ensure wallet is on Base mainnet (Chain ID: 8453)

### Fix 4: Insufficient Balance
- Wallet needs 1+ USDC
- Paymaster needs sufficient balance in CDP Dashboard

## 🔗 Quick Links

- **CDP Dashboard:** https://portal.cdp.coinbase.com/products/bundler-and-paymaster
- **Base Mainnet Explorer:** https://basescan.org
- **USDC Contract:** https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- **TriviaBattle Contract:** https://basescan.org/address/0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13

## 📝 Testing Workflow

1. **Restart Dev Server:** `npm run dev`
2. **Open Console:** F12 → Console tab
3. **Clear Console:** Ctrl+L (Cmd+K on Mac)
4. **Connect Wallet:** Watch for automatic tests
5. **Try Transaction:** Click "Start Paid Game"
6. **Review Logs:** Check for ✅ or ❌ indicators

---

**Need More Help?** See `PAYMASTER_DEBUG_GUIDE.md` for detailed troubleshooting

