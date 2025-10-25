#!/bin/bash

# Deployment script for AutomationCounter to Ethereum Mainnet
# Usage: ./deploy-automation-mainnet.sh [UPDATE_INTERVAL]

set -e

echo "========================================="
echo "AutomationCounter Deployment - MAINNET"
echo "========================================="
echo "WARNING: You are about to deploy to Ethereum Mainnet!"
echo "This will cost real ETH and LINK tokens."
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
    echo "  ETHERSCAN_API_KEY=your_etherscan_api_key (optional, for verification)"
    exit 1
fi

# Source environment variables
source .env

# Set update interval (default 3600 seconds = 1 hour for mainnet)
UPDATE_INTERVAL=${1:-3600}
export UPDATE_INTERVAL

echo ""
echo "Configuration:"
echo "  Network: Ethereum Mainnet (Chain ID: 1)"
echo "  Update Interval: ${UPDATE_INTERVAL} seconds"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

# Check if RPC URL is set
if [ -z "$MAINNET_RPC_URL" ]; then
    echo "Error: MAINNET_RPC_URL not set in .env file"
    exit 1
fi

echo "Building contracts..."
forge build

echo ""
echo "Deploying to Mainnet..."
echo ""

# Deploy with verification if ETHERSCAN_API_KEY is set
if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo "Deploying with Etherscan verification..."
    forge script script/DeployAutomationCounter.s.sol:DeployAutomationCounter \
        --rpc-url "$MAINNET_RPC_URL" \
        --broadcast \
        --verify \
        --etherscan-api-key "$ETHERSCAN_API_KEY" \
        -vvvv
else
    echo "Deploying without verification (ETHERSCAN_API_KEY not set)..."
    forge script script/DeployAutomationCounter.s.sol:DeployAutomationCounter \
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
echo "1. Copy the contract address from the output above"
echo "2. Acquire LINK tokens for funding the upkeep"
echo "3. Register your upkeep at: https://automation.chain.link/mainnet"
echo "4. Select 'Custom logic' as the trigger type"
echo "5. Paste your contract address"
echo "6. Fund with LINK tokens"
echo ""
echo "IMPORTANT: Monitor your upkeep to ensure it has sufficient LINK balance"
echo ""

