#!/bin/bash

# Deployment script for TriviaBattlev2 to Sepolia testnet
# Usage: ./deploy-trivia-sepolia.sh

set -e

echo "========================================="
echo "TriviaBattlev2 Deployment - Sepolia"
echo "========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "  PRIVATE_KEY=your_private_key"
    echo "  SEPOLIA_RPC_URL=your_sepolia_rpc_url"
    echo "  USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    echo "  GAME_ORACLE_ADDRESS=your_oracle_wallet"
    echo "  PLATFORM_FEE_RECIPIENT=your_fee_recipient"
    echo "  ETHERSCAN_API_KEY=your_etherscan_api_key (optional)"
    exit 1
fi

# Source environment variables
source .env

echo "Configuration:"
echo "  Network: Sepolia (Chain ID: 11155111)"
echo "  USDC Address: $USDC_ADDRESS"
echo "  Game Oracle: $GAME_ORACLE_ADDRESS"
echo "  Platform Fee Recipient: $PLATFORM_FEE_RECIPIENT"
echo ""

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "Error: SEPOLIA_RPC_URL not set in .env file"
    exit 1
fi

if [ -z "$USDC_ADDRESS" ]; then
    echo "Error: USDC_ADDRESS not set in .env file"
    exit 1
fi

if [ -z "$GAME_ORACLE_ADDRESS" ]; then
    echo "Error: GAME_ORACLE_ADDRESS not set in .env file"
    exit 1
fi

if [ -z "$PLATFORM_FEE_RECIPIENT" ]; then
    echo "Error: PLATFORM_FEE_RECIPIENT not set in .env file"
    exit 1
fi

echo "Building contracts..."
forge build

echo ""
echo "Deploying TriviaBattlev2 to Sepolia..."
echo ""

# Deploy with verification if ETHERSCAN_API_KEY is set
if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo "Deploying with Etherscan verification..."
    forge script script/DeployTriviaBattlev2Automation.s.sol:DeployTriviaBattlev2Automation \
        --rpc-url "$SEPOLIA_RPC_URL" \
        --broadcast \
        --verify \
        --etherscan-api-key "$ETHERSCAN_API_KEY" \
        -vvvv
else
    echo "Deploying without verification (ETHERSCAN_API_KEY not set)..."
    forge script script/DeployTriviaBattlev2Automation.s.sol:DeployTriviaBattlev2Automation \
        --rpc-url "$SEPOLIA_RPC_URL" \
        --broadcast \
        -vvvv
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Copy the TriviaGame contract address from the output above"
echo "2. Get Sepolia LINK tokens from: https://faucets.chain.link/sepolia"
echo "3. Get Sepolia USDC tokens from: https://faucets.chain.link/sepolia"
echo "4. Register your upkeep at: https://automation.chain.link/sepolia"
echo "5. Select 'Custom logic' as the trigger type"
echo "6. Paste your contract address"
echo "7. Set gas limit: 500,000"
echo "8. Fund with 10 LINK tokens"
echo "9. Test the game flow!"
echo ""
echo "Game Testing Flow:"
echo "1. Call createGame() to start a new game"
echo "2. Players call enterGame() (pay 1 USDC)"
echo "3. Wait 5 minutes for game to end"
echo "4. Oracle calls submitRankings()"
echo "5. Watch Chainlink auto-finalize the game!"
echo "6. Winners call claimPrize()"
echo ""

