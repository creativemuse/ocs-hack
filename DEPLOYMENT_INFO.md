# TriviaBattlev4 Deployment Information

## Contract Details
- **Contract Address**: `0x8CaFC4cC36f141d52C7CF6BcE7f68bAf867b7182`
- **Network**: Base Sepolia (Chain ID: 84532)
- **Deployment Date**: $(date +"%Y-%m-%d %H:%M:%S")
- **Explorer**: https://sepolia.basescan.org/address/0x8cafc4cc36f141d52c7cf6bce7f68baf867b7182

## Configuration
- **Platform Fee**: 7% (700 basis points)
- **Platform Fee Recipient**: `0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260` (thecreative.eth)
- **Simple Automation Threshold**: $100 USDC (100e6)
- **Entry Fee**: 1 USDC (1e6)
- **Game Duration**: 5 minutes (300 seconds)

## Chainlink Configuration
- **Functions Router**: `0xf9B8fc078197181C841c296C876945aaa425B278`
- **Subscription ID**: 102
- **DON ID**: `0x66756f2d626173652d7365706f6c69612d310000000000000000000000000000`
- **Gas Limit**: 300000

## Hybrid Chainlink Mode
- **SimpleAutomation**: Games with expected prize pool < $100
  - Uses fallback oracle only (no Chainlink Functions cost)
  - Rankings can be submitted immediately via `submitRankingsFallback()`
  
- **FullDON**: Games with expected prize pool >= $100
  - Uses Chainlink Functions DON for decentralized consensus
  - Rankings requested via `requestRankings()`
  - Fallback only after 10-minute timeout

## Next Steps
1. ✅ Contract deployed and verified
2. ⏳ Add contract as consumer to Chainlink Functions subscription 102
3. ⏳ Call `updateFunctionsConfig()` with ranking source JavaScript
4. ⏳ Test game creation and entry
5. ⏳ Test Chainlink mode selection logic
6. ⏳ Verify platform fee withdrawal to thecreative.eth

## Post-Deployment Configuration

### 1. Add Contract as Consumer
Add `0x8CaFC4cC36f141d52C7CF6BcE7f68bAf867b7182` as a consumer to subscription 102 in Chainlink Functions dashboard.

### 2. Configure Functions
Call `updateFunctionsConfig()` on the contract:
```solidity
triviaGame.updateFunctionsConfig(
    102,                    // subscriptionId
    300000,                 // gasLimit
    0x66756f2d626173652d7365706f6c69612d310000000000000000000000000000, // donID
    "[YOUR_JAVASCRIPT_SOURCE_CODE]" // rankingSource
);
```

### 3. Update Frontend
Update `lib/blockchain/contracts.ts` with the new contract address (already done).

