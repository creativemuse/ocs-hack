#!/bin/bash
# Quick test script - makes it easy to start a session and join

set -e

CONTRACT="0xe72Fc03137A1412354ca97282071d173Ae592D96"
USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "🧪 Quick Test Script - Start Session"
echo "===================================="
echo ""

if [ -z "$CONTRACT_OWNER_PRIVATE_KEY" ] && [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: CONTRACT_OWNER_PRIVATE_KEY or PRIVATE_KEY not set in .env"
    echo ""
    echo "Add to your .env file:"
    echo "  CONTRACT_OWNER_PRIVATE_KEY=your_private_key_here"
    exit 1
fi

OWNER_KEY="${CONTRACT_OWNER_PRIVATE_KEY:-$PRIVATE_KEY}"
OWNER_ADDRESS=$(cast wallet address --private-key "$OWNER_KEY")

# Get actual contract owner
echo "0. Verifying contract owner..."
CONTRACT_OWNER=$(cast call "$CONTRACT" "owner()(address)" --rpc-url "$RPC_URL")
echo "   Contract Owner: $CONTRACT_OWNER"
echo "   Your Address:   $OWNER_ADDRESS"
echo ""

# Convert both to lowercase for comparison
OWNER_LOWER=$(echo "$OWNER_ADDRESS" | tr '[:upper:]' '[:lower:]')
CONTRACT_OWNER_LOWER=$(echo "$CONTRACT_OWNER" | tr '[:upper:]' '[:lower:]')

if [ "$OWNER_LOWER" != "$CONTRACT_OWNER_LOWER" ]; then
    echo "   ❌ ERROR: Your address does not match the contract owner!"
    echo ""
    echo "   The contract owner is: $CONTRACT_OWNER"
    echo "   Your address is:       $OWNER_ADDRESS"
    echo ""
    echo "   You need to set CONTRACT_OWNER_PRIVATE_KEY in your .env file"
    echo "   with the private key for address: $CONTRACT_OWNER"
    echo ""
    echo "   Current .env has:"
    if [ ! -z "$CONTRACT_OWNER_PRIVATE_KEY" ]; then
        echo "     CONTRACT_OWNER_PRIVATE_KEY=*** (set but wrong wallet)"
    elif [ ! -z "$PRIVATE_KEY" ]; then
        echo "     PRIVATE_KEY=*** (set but wrong wallet)"
    else
        echo "     (not set)"
    fi
    echo ""
    exit 1
fi
echo "   ✅ Address matches contract owner!"
echo ""

# Check if session is already active
echo "1. Checking current session status..."
SESSION_ACTIVE=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
if [ "$SESSION_ACTIVE" = "true" ]; then
    echo "   ⚠️  Session is already active!"
    echo ""
    echo "   You can join as a player now:"
    echo "     bash scripts/join-as-player.sh"
    echo ""
    exit 0
fi
echo "   ✅ No active session, proceeding to start one..."
echo ""

echo "2. Starting new session..."
echo "   Sending transaction (this may take 10-30 seconds)..."
echo ""

# Try sending with async mode first (faster)
TX_OUTPUT=$(timeout 30 cast send "$CONTRACT" "startNewSession()" --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" --async 2>&1) || {
    # If async fails, try without async (waits for confirmation)
    echo "   Trying synchronous send (will wait for confirmation)..."
    TX_OUTPUT=$(timeout 60 cast send "$CONTRACT" "startNewSession()" --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" 2>&1)
}

# Extract transaction hash
TX_HASH=$(echo "$TX_OUTPUT" | grep -oE "0x[a-fA-F0-9]{64}" | head -n 1 || echo "")

if [ -z "$TX_HASH" ]; then
    # Check for errors
    if echo "$TX_OUTPUT" | grep -qi "error\|revert\|failed\|insufficient\|nonce"; then
        echo "   ❌ Failed to start session!"
        echo ""
        echo "   Error details:"
        echo "$TX_OUTPUT" | grep -i "error\|revert\|failed\|insufficient" | head -n 5
        echo ""
    else
        echo "   ⚠️  Could not extract transaction hash"
        echo "   Output: $TX_OUTPUT"
        echo ""
    fi
    echo "   Troubleshooting:"
    echo "   1. Check ETH balance: cast balance $OWNER_ADDRESS --rpc-url $RPC_URL"
    echo "   2. Try manually: cast send $CONTRACT \"startNewSession()\" --rpc-url $RPC_URL --private-key \$CONTRACT_OWNER_PRIVATE_KEY"
    exit 1
fi

echo "   ✅ Transaction sent: $TX_HASH"
echo "   View on Basescan: https://sepolia.basescan.org/tx/$TX_HASH"
echo ""

echo "3. Waiting for confirmation (10 seconds)..."
sleep 10

echo "4. Verifying session status..."
SESSION_ACTIVE=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
if [ "$SESSION_ACTIVE" = "true" ]; then
    echo "   ✅ Session is now active!"
    echo ""
    echo "🎉 Success! Session started successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Join as a player:"
    echo "     bash scripts/join-as-player.sh"
    echo ""
    echo "  2. Or check session info:"
    echo "     cast call $CONTRACT \"getCurrentPlayers()(address[])\" --rpc-url $RPC_URL"
else
    echo "   ❌ Session start may have failed. Check transaction: $TX"
    echo "   View on Basescan: https://sepolia.basescan.org/tx/$TX"
fi
