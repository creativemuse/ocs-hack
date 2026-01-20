#!/bin/bash
# Join battle as a player

set -e

CONTRACT="0xe72Fc03137A1412354ca97282071d173Ae592D96"
USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
ENTRY_FEE=1000000  # 1 USDC

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$TEST_PLAYER_PRIVATE_KEY" ]; then
    echo "❌ Error: TEST_PLAYER_PRIVATE_KEY not set in .env"
    echo "   Add: TEST_PLAYER_PRIVATE_KEY=your_private_key"
    exit 1
fi

PLAYER_ADDRESS=$(cast wallet address --private-key "$TEST_PLAYER_PRIVATE_KEY")
echo "🧪 Joining Battle as Player"
echo "=========================="
echo "Player Address: $PLAYER_ADDRESS"
echo ""

echo "1. Checking if session is active..."
SESSION_ACTIVE=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
if [ "$SESSION_ACTIVE" != "true" ]; then
    echo "   ❌ No active session. Please start a session first:"
    echo "      bash scripts/quick-test.sh"
    exit 1
fi
echo "   ✅ Session is active"
echo ""

echo "2. Checking USDC balance..."
BALANCE=$(cast call "$USDC" "balanceOf(address)(uint256)" "$PLAYER_ADDRESS" --rpc-url "$RPC_URL" 2>/dev/null | head -n 1 | awk '{print $1}' || echo "0")
# Remove any formatting from cast output (like [2e6])
BALANCE=$(echo "$BALANCE" | sed 's/\[.*\]//' | tr -d ' \n')
if [ -z "$BALANCE" ] || [ "$BALANCE" = "" ]; then
    BALANCE="0"
fi
if [ "$BALANCE" -lt "$ENTRY_FEE" ]; then
    echo "   ❌ Insufficient USDC. Need: $ENTRY_FEE wei (1 USDC), Have: $BALANCE"
    exit 1
fi
echo "   ✅ USDC Balance: $BALANCE wei ($(echo "scale=6; $BALANCE / 1000000" | bc) USDC)"
echo ""

echo "3. Checking/Approving USDC..."
ALLOWANCE=$(cast call "$USDC" "allowance(address,address)(uint256)" "$PLAYER_ADDRESS" "$CONTRACT" --rpc-url "$RPC_URL" 2>/dev/null | head -n 1 | awk '{print $1}' || echo "0")
ALLOWANCE=$(echo "$ALLOWANCE" | sed 's/\[.*\]//' | tr -d ' \n')
if [ -z "$ALLOWANCE" ] || [ "$ALLOWANCE" = "" ]; then
    ALLOWANCE="0"
fi
if [ "$ALLOWANCE" -lt "$ENTRY_FEE" ]; then
    echo "   Approving USDC..."
    TX=$(cast send "$USDC" "approve(address,uint256)" "$CONTRACT" "$ENTRY_FEE" --rpc-url "$RPC_URL" --private-key "$TEST_PLAYER_PRIVATE_KEY" --json | jq -r '.transactionHash')
    echo "   ✅ Approval TX: $TX"
    sleep 3
else
    echo "   ✅ USDC already approved"
fi
echo ""

echo "4. Joining battle..."
TX=$(cast send "$CONTRACT" "joinBattle()" --rpc-url "$RPC_URL" --private-key "$TEST_PLAYER_PRIVATE_KEY" --json | jq -r '.transactionHash')
echo "   ✅ Join TX: $TX"
sleep 3
echo ""

echo "5. Verifying..."
PLAYERS=$(cast call "$CONTRACT" "getCurrentPlayers()(address[])" --rpc-url "$RPC_URL")
PRIZE_POOL=$(cast call "$CONTRACT" "getContractUsdcBalance()(uint256)" --rpc-url "$RPC_URL")

echo "   Players: $PLAYERS"
echo "   Prize Pool: $PRIZE_POOL wei"

if echo "$PLAYERS" | grep -qi "$(echo $PLAYER_ADDRESS | tr '[:upper:]' '[:lower:]')"; then
    echo ""
    echo "✅ Successfully joined battle!"
else
    echo ""
    echo "⚠️  Player may not appear immediately. Check transaction: $TX"
fi
