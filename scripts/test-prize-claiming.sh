#!/bin/bash

# Prize Claiming Tests Runner
# This script runs the prize claiming tests with proper environment setup

set -e

echo "🧪 Starting Prize Claiming Tests..."

# Check if required tools are installed
if ! command -v tsx &> /dev/null; then
    echo "❌ tsx is not installed. Please install it with: npm install -g tsx"
    exit 1
fi

# Check if environment variables are set
if [ -z "$SPACETIME_URI" ]; then
    echo "⚠️ SPACETIME_URI not set, using default: http://localhost:3000"
    export SPACETIME_URI="http://localhost:3000"
fi

if [ -z "$MODULE_NAME" ]; then
    echo "⚠️ MODULE_NAME not set, using default: beat-me"
    export MODULE_NAME="beat-me"
fi

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "⚠️ CONTRACT_ADDRESS not set, using placeholder"
    export CONTRACT_ADDRESS="0x..."
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️ PRIVATE_KEY not set, using placeholder"
    export PRIVATE_KEY="0x..."
fi

# Run the tests
echo "🚀 Running prize claiming tests..."

# Run all tests by default
if [ $# -eq 0 ]; then
    echo "Running all tests..."
    tsx scripts/run-prize-claiming-tests.ts --all
else
    echo "Running tests with arguments: $@"
    tsx scripts/run-prize-claiming-tests.ts "$@"
fi

echo "✅ Prize claiming tests completed!"
