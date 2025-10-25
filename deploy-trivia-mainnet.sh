#!/bin/bash

# Deployment script for TriviaBattlev2 to Ethereum Mainnet
# Usage: ./deploy-trivia-mainnet.sh

set -e

echo "========================================="
echo "TriviaBattlev2 Deployment - MAINNET"
echo "========================================="
echo "WARNING: You are about to deploy to Ethereum Mainnet!"
echo "This will cost real ETH and require real USDC/LINK tokens."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "  PRIVATE_KEY=your_private_key"
    echo "  MAINNET_RPC_URL=your_mainnet_rpc_url"
    echo "  USDC_ADDRESS=0xA0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C"
    echo "  GAME_ORACLE_ADDRESS=your_oracle_wallet"
    echo "  PLATFORM_FEE_RECIPIENT=your_fee_recipient"
    echo "  ETHERSCAN_API_KEY=your_etherscan_api_key (optional)"
    exit 1
fi

# Source environment variables
source .env

echo ""
echo "Configuration:"
echo "  Network: Ethereum Mainnet (Chain ID: 1)"
echo "  USDC Address: $USDC_ADDRESS"
echo "  Game Oracle: $GAME_ORACLE_ADDRESS"
echo "  Platform Fee Recipient: $PLATFORM_FEE_RECIPIENT"
echo ""

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

if [ -z "$MAINNET_RPC_URL" ]; then
    echo "Error: MAINNET_RPC_URL not set in .env file"
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
echo "Deploying TriviaBattlev2 to Mainnet..."
echo ""

# Deploy with verification if ETHERSCAN_API_KEY is set
if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo "Deploying with Etherscan verification..."
    forge script script/DeployTriviaBattlev2Automation.s.sol:DeployTriviaBattlev2Automation \
        --rpc-url "$MAINNET_RPC_URL" \
        --broadcast \
        --verify \
        --etherscan-api-key "$ETHERSCAN_API_KEY" \
        -vvvv
else
    echo "Deploying without verification (ETHERSCAN_API_KEY not set)..."
    forge script script/DeployTriviaBattlev2Automation.s.sol:DeployTriviaBattlev2Automation \
        --rpc-url "$MAINNET_RPC_URL" \
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
echo "2. Acquire LINK tokens for funding the upkeep"
echo "3. Acquire USDC tokens for game entry fees"
echo "4. Register your upkeep at: https://automation.chain.link/mainnet"
echo "5. Select 'Custom logic' as the trigger type"
echo "6. Paste your contract address"
echo "7. Set gas limit: 500,000"
echo "8. Fund with sufficient LINK tokens"
echo "9. Test thoroughly before going live!"
echo ""
echo "IMPORTANT: Monitor your upkeep to ensure it has sufficient LINK balance"
echo ""

