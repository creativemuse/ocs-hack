#!/bin/bash

# Deploy TriviaBattlev2 to Base Mainnet
# Usage: ./deploy-mainnet.sh

set -e

echo "⚠️  WARNING: You are about to deploy to Base MAINNET!"
echo "This will cost real money and cannot be undone."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🚀 Deploying TriviaBattlev2 to Base Mainnet..."
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

if [ -z "$BASESCAN_API_KEY" ]; then
    echo "⚠️  Warning: BASESCAN_API_KEY not set - contract won't be verified"
fi

echo "📋 Deployment Configuration:"
echo "   Network: Base Mainnet (Chain ID: 8453)"
echo "   Oracle: $GAME_ORACLE_ADDRESS"
echo "   Fee Recipient: $PLATFORM_FEE_RECIPIENT"
echo ""

read -p "Double-check the addresses above. Continue? (yes/no): " confirm2

if [ "$confirm2" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

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
echo "📤 Deploying contract to MAINNET..."
forge script script/DeployTriviaBattlev2.s.sol:DeployTriviaBattlev2 \
    --rpc-url $BASE_MAINNET_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvvv

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Mainnet deployment successful!"
    echo ""
    echo "🎉 IMPORTANT: Save the contract address!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. SAVE the contract address from the output above"
    echo "   2. Verify the contract on Basescan"
    echo "   3. Update production frontend configuration"
    echo "   4. Test thoroughly before announcing"
    echo "   5. Create the first game using createGame()"
    echo "   6. Monitor the contract for any issues"
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi

