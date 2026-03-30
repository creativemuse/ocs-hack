#!/bin/bash
# Manual session start - simpler version

set -e

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTRACT="0xe72Fc03137A1412354ca97282071d173Ae592D96"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
OWNER_KEY="${CONTRACT_OWNER_PRIVATE_KEY:-$PRIVATE_KEY}"

if [ -z "$OWNER_KEY" ]; then
    echo "❌ CONTRACT_OWNER_PRIVATE_KEY not set in .env"
    exit 1
fi

echo "Starting session..."
echo "Contract: $CONTRACT"
echo ""

cast send "$CONTRACT" \
    "startNewSession()" \
    --rpc-url "$RPC_URL" \
    --private-key "$OWNER_KEY"

echo ""
echo "✅ Transaction sent! Check the hash above."
echo ""
echo "Verify session started:"
echo "  cast call $CONTRACT \"isSessionActive()(bool)\" --rpc-url $RPC_URL"
