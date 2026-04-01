#!/bin/bash

# Deploy TriviaBattlev2 to Base Sepolia
# Usage: ./deploy-sepolia.sh

set -e

echo "🚀 Deploying TriviaBattlev2 to Base Sepolia..."
echo ""

# Load environment variables
if [ -f .env ]; then
    # Export variables from .env, handling comments and empty lines
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z $key ]] && continue
        # Remove leading/trailing whitespace and quotes
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        # Remove quotes if present
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        # Export the variable
        export "$key=$value"
    done < .env
else
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with required variables."
    exit 1
fi

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$GAME_ORACLE_ADDRESS" ]; then
    echo "❌ Error: GAME_ORACLE_ADDRESS not set in .env"
    exit 1
fi

if [ -z "$PLATFORM_FEE_RECIPIENT" ]; then
    echo "❌ Error: PLATFORM_FEE_RECIPIENT not set in .env"
    exit 1
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "⚠️  Warning: ETHERSCAN_API_KEY not set - contract won't be verified"
fi

echo "📋 Deployment Configuration:"
echo "   Network: Base Sepolia (Chain ID: 84532)"
echo "   Oracle: $GAME_ORACLE_ADDRESS"
echo "   Fee Recipient: $PLATFORM_FEE_RECIPIENT"
echo ""

# Compile contracts
echo "🔨 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo "✅ Compilation successful!"
echo ""

# Deploy contract
echo "📤 Deploying contract..."
forge script script/DeployTriviaBattlev2.s.sol:DeployTriviaBattlev2 \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Save the contract address from the output above"
    echo "   2. Update your frontend configuration"
    echo "   3. Test the contract on Basescan"
    echo "   4. Create the first game using createGame()"
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi

