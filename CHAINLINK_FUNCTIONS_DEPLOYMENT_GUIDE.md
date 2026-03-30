# Chainlink Functions Integration Deployment Guide 🔗

## Overview

This guide walks you through deploying the TriviaBattlev4 contract with Chainlink Functions integration for decentralized ranking submission.

## Prerequisites

- ✅ Chainlink Functions subscription (ID: 102) - **You already have this!**
- ✅ Base Sepolia/Mainnet RPC access
- ✅ USDC tokens for testing
- ✅ Deployer wallet with ETH for gas fees

## Step 1: Update Environment Variables

Copy and update your `.env` file:

```bash
# Copy the example
cp env.example .env

# Edit .env with your values
nano .env
```

Required variables:
```bash
# Your existing subscription
FUNCTIONS_SUBSCRIPTION_ID=102

# Your backend API URL (replace with your domain)
BACKEND_API_URL=https://your-domain.com

# Other required variables...
PRIVATE_KEY=your_private_key_here
GAME_ORACLE_ADDRESS=0x0000000000000000000000000000000000000000
PLATFORM_FEE_RECIPIENT=0x0000000000000000000000000000000000000000
```

## Step 2: Deploy to Base Sepolia

```bash
# Deploy the contract
forge script script/DeployTriviaBattlev4.s.sol:DeployTriviaBattlev4 \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify

# Note the deployed contract address from the output
```

## Step 3: Add Contract to Subscription 102

1. Go to https://functions.chain.link/
2. Select subscription 102
3. Click "Add consumer"
4. Enter your deployed contract address
5. Confirm the transaction

## Step 4: Configure Chainlink Functions

After deployment, call `updateFunctionsConfig()` on your contract:

```bash
# Get the JavaScript source code
cat chainlink-functions-source-minified.js

# Copy the minified source code and update the API URL
# Replace "https://your-domain.com" with your actual domain
```

Then call the contract function:

```solidity
// Call this on your deployed contract
triviaGame.updateFunctionsConfig(
    102,                    // subscriptionId (your existing subscription)
    300000,                 // gasLimit
    0x66756f2d626173652d7365706f6c69612d310000000000000000000000000000, // Base Sepolia DON ID
    "[YOUR_MINIFIED_JAVASCRIPT_SOURCE_CODE]" // rankingSource
);
```

## Step 5: Test the Integration

### 5.1 Create a Test Game

```solidity
// Call on your contract
triviaGame.createGame();
```

### 5.2 Have Players Enter

```solidity
// Players enter by paying 1 USDC
triviaGame.enterGame();
```

### 5.3 Wait for Game to End

Wait 5 minutes for the game to end.

### 5.4 Request Rankings via Chainlink Functions

```solidity
// This triggers the DON to fetch rankings from your API
triviaGame.requestRankings(gameId);
```

### 5.5 Monitor Events

Watch for these events:
- `RankingsRequested` - Functions request sent
- `RankingsReceived` - DON consensus reached
- `RankingsSubmitted` - Rankings stored in contract
- `GameFinalized` - Game completed (via Automation)

## Step 6: Deploy to Base Mainnet

After successful Sepolia testing:

```bash
# Deploy to Base Mainnet
forge script script/DeployTriviaBattlev4.s.sol:DeployTriviaBattlev4 \
    --rpc-url $BASE_MAINNET_RPC_URL \
    --broadcast \
    --verify
```

## Step 7: Frontend Integration

Update your frontend with the new contract addresses:

```typescript
// Update your contract configuration
const TRIVIA_CONTRACTS = {
  baseSepolia: "0x...", // New v4 address
  baseMainnet: "0x..."  // New v4 address
};
```

## Troubleshooting

### Functions Request Fails

1. Check subscription 102 balance
2. Verify contract is added as consumer
3. Check API endpoint is accessible
4. Review JavaScript source code for errors

### API Endpoint Issues

1. Test endpoint manually: `curl https://your-domain.com/api/chainlink/game-rankings/1`
2. Check CORS headers
3. Verify SpacetimeDB connection
4. Check game session data exists

### Fallback Oracle

If Functions fails, you can use the fallback:

```solidity
// Disable Functions temporarily
triviaGame.toggleChainlinkFunctions(false);

// Submit rankings manually (only fallback oracle)
triviaGame.submitRankingsFallback(gameId, [player1, player2, player3]);
```

## Monitoring

### Subscription Balance

Monitor subscription 102 balance at https://functions.chain.link/

### Contract Events

Watch for these key events:
- `RankingsRequested` - Functions request initiated
- `RankingsReceived` - DON consensus reached
- `GameFinalized` - Game completed
- `PrizeClaimed` - Players claiming prizes

### Gas Costs

- Functions requests: ~0.1 LINK per request
- Contract deployment: ~0.01 ETH
- Game operations: ~0.001 ETH per transaction

## Security Features

✅ **Decentralized Rankings**: Chainlink DON provides consensus
✅ **Fallback Oracle**: Emergency manual submission
✅ **Automatic Finalization**: Chainlink Automation
✅ **Proportional Redistribution**: 100% of pool distributed
✅ **Platform Fees**: 3% fee collection
✅ **Reentrancy Protection**: SafeERC20 usage

## Next Steps

1. Deploy to Base Sepolia
2. Test with small amounts
3. Monitor subscription balance
4. Deploy to Base Mainnet
5. Update frontend
6. Go live! 🚀

## Support

- Chainlink Functions Docs: https://docs.chain.link/functions
- Base Network: https://base.org
- Your API endpoint: `https://your-domain.com/api/chainlink/game-rankings/{gameId}`
