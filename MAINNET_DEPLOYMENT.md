# TriviaBattlev4 Mainnet Deployment

> **App / CRE default (current `TriviaBattle.sol`):** `0xfF52Ed1DEb46C197aD7fce9DEC93ff9e987f8dB6` on Base.  
> The sections below describe the **TriviaBattlev4** deployment and Chainlink Functions setup for the older address `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`.

## 🎉 Contract Successfully Deployed to Base Mainnet

**Contract Address**: `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`  
**Network**: Base Mainnet (Chain ID: 8453)  
**Explorer**: https://basescan.org/address/0xd8f082fa4ef6a4c59f8366c19a196d488485682b  
**Status**: ✅ Verified on Basescan

## Configuration

- **Platform Fee**: 7% (700 basis points)
- **Platform Fee Recipient**: `0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260` (thecreative.eth)
- **Simple Automation Threshold**: $100 USDC (100e6)
- **Entry Fee**: 1 USDC (1e6)
- **Game Duration**: 5 minutes (300 seconds)

## Chainlink Configuration

- **Functions Router**: `0xf9B8fc078197181C841c296C876945aaa425B278`
- **Subscription ID**: 102
- **DON ID** (Mainnet): `0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000`
- **Gas Limit**: 300000

## Hybrid Chainlink Mode

- **SimpleAutomation** (< $100): Uses fallback oracle only (no Chainlink Functions cost)
- **FullDON** (≥ $100): Uses Chainlink Functions DON for decentralized consensus

## ✅ Completed Steps

1. ✅ Contract deployed to Base Mainnet
2. ✅ Contract verified on Basescan
3. ✅ Frontend configuration updated

## ⏳ Next Steps (REQUIRED)

### 1. Add Contract as Consumer
Add `0xd8F082fa4EF6a4C59F8366c19a196d488485682b` as a consumer to Chainlink Functions subscription 102:
- Go to [Chainlink Functions Dashboard](https://functions.chain.link/)
- Navigate to subscription 102
- Add consumer: `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`

### 2. Configure Chainlink Functions
Call `updateFunctionsConfig()` on the contract with your ranking source JavaScript:

```solidity
triviaGame.updateFunctionsConfig(
    102,                    // subscriptionId
    300000,                 // gasLimit
    0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000, // donID (Base Mainnet)
    "[YOUR_JAVASCRIPT_SOURCE_CODE]" // rankingSource
);
```

### 3. Test the Contract
1. Create a test game using `createGame()`
2. Test entering with USDC
3. Verify 7% platform fee is correctly calculated
4. Test Chainlink mode selection logic
5. Verify platform fees accumulate correctly

## Important Notes

- **Mainnet Deployment**: This is a production deployment with real USDC
- **Platform Fees**: Accumulate in the contract until withdrawn via `withdrawPlatformFees()`
- **Fee Recipient**: All fees go to `0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260` (thecreative.eth)
- **Chainlink Modes**: Automatically selected based on expected prize pool size

## Deployment Gas Costs

- **Deployment**: ~3.99M gas
- **Gas Price**: ~0.0065 gwei
- **Total Cost**: ~0.000026 ETH

## Contract Functions

Key functions:
- `createGame()` - Create a new game (owner only)
- `enterGame()` - Enter the current game (1 USDC entry fee)
- `requestRankings()` - Request rankings via Chainlink Functions (FullDON mode only)
- `submitRankingsFallback()` - Submit rankings via fallback oracle (SimpleAutomation mode)
- `claimPrize()` - Claim winnings after game finalization
- `withdrawPlatformFees()` - Withdraw accumulated platform fees (owner only)

