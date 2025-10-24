#!/bin/bash

# Deployment script for AutomationCounter to Sepolia testnet
# Usage: ./deploy-automation-sepolia.sh [UPDATE_INTERVAL]

set -e

echo "========================================="
echo "AutomationCounter Deployment - Sepolia"
echo "========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "  PRIVATE_KEY=your_private_key"
    echo "  SEPOLIA_RPC_URL=your_sepolia_rpc_url"
    echo "  ETHERSCAN_API_KEY=your_etherscan_api_key (optional, for verification)"
    exit 1
fi

# Source environment variables
source .env

# Set update interval (default 60 seconds if not provided)
UPDATE_INTERVAL=${1:-60}
export UPDATE_INTERVAL

echo "Configuration:"
echo "  Network: Sepolia (Chain ID: 11155111)"
echo "  Update Interval: ${UPDATE_INTERVAL} seconds"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

# Check if RPC URL is set
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "Error: SEPOLIA_RPC_URL not set in .env file"
    exit 1
fi

echo "Building contracts..."
forge build

echo ""
echo "Deploying to Sepolia..."
echo ""

# Deploy with verification if ETHERSCAN_API_KEY is set
if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo "Deploying with Etherscan verification..."
    forge script script/DeployAutomationCounter.s.sol:DeployAutomationCounter \
        --rpc-url "$SEPOLIA_RPC_URL" \
        --broadcast \
        --verify \
        --etherscan-api-key "$ETHERSCAN_API_KEY" \
        -vvvv
else
    echo "Deploying without verification (ETHERSCAN_API_KEY not set)..."
    forge script script/DeployAutomationCounter.s.sol:DeployAutomationCounter \
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
echo "1. Copy the contract address from the output above"
echo "2. Get Sepolia LINK tokens from: https://faucets.chain.link/sepolia"
echo "3. Register your upkeep at: https://automation.chain.link/sepolia"
echo "4. Select 'Custom logic' as the trigger type"
echo "5. Paste your contract address"
echo "6. Fund with LINK tokens"
echo ""

