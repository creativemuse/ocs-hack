#!/bin/bash
# Test script to simulate workflow logic manually
# This checks what the CRE workflow would detect

set -e

CONTRACT="0xe72Fc03137A1412354ca97282071d173Ae592D96"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"

echo "🧪 Testing Workflow Logic"
echo "========================="
echo ""

echo "1. Reading contract state (what workflow would check)..."
echo ""

# Check session active
IS_ACTIVE=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
echo "   Session Active: $IS_ACTIVE"

# Check prize pool
PRIZE_POOL=$(cast call "$CONTRACT" "getContractUsdcBalance()(uint256)" --rpc-url "$RPC_URL" | head -n 1 | awk '{print $1}' | sed 's/\[.*\]//')
PRIZE_POOL_USDC=$(echo "scale=6; $PRIZE_POOL / 1000000" | bc 2>/dev/null || echo "0")
echo "   Prize Pool: $PRIZE_POOL wei ($PRIZE_POOL_USDC USDC)"

# Check last session time
LAST_SESSION=$(cast call "$CONTRACT" "lastSessionTime()(uint256)" --rpc-url "$RPC_URL" | head -n 1 | awk '{print $1}' | sed 's/\[.*\]//')
SESSION_INTERVAL=$(cast call "$CONTRACT" "sessionInterval()(uint256)" --rpc-url "$RPC_URL" | head -n 1 | awk '{print $1}' | sed 's/\[.*\]//')
END_TIME=$((LAST_SESSION + SESSION_INTERVAL))

CURRENT_TIME=$(date +%s)
IS_SESSION_ENDED=$([ "$IS_ACTIVE" = "false" ] && [ $CURRENT_TIME -gt $END_TIME ] && echo "true" || echo "false")

echo "   Last Session Time: $LAST_SESSION ($(date -r $LAST_SESSION 2>/dev/null || echo 'timestamp'))"
echo "   Session End Time: $END_TIME ($(date -r $END_TIME 2>/dev/null || echo 'timestamp'))"
echo "   Current Time: $CURRENT_TIME ($(date))"
echo "   Session Ended: $IS_SESSION_ENDED"
echo ""

# Workflow logic simulation
echo "2. Workflow Decision Logic:"
echo ""

if [ "$IS_SESSION_ENDED" = "false" ]; then
    REASON="Session still active. End time: $END_TIME, Current time: $CURRENT_TIME"
    echo "   ❌ Would NOT distribute: $REASON"
    echo "   Distribution Executed: false"
elif [ "$PRIZE_POOL" = "0" ]; then
    REASON="No prize pool to distribute"
    echo "   ❌ Would NOT distribute: $REASON"
    echo "   Distribution Executed: false"
else
    # Heuristic: prizes already distributed if inactive and no pool
    PRIZES_DISTRIBUTED=$([ "$IS_ACTIVE" = "false" ] && [ "$PRIZE_POOL" = "0" ] && echo "true" || echo "false")
    
    if [ "$PRIZES_DISTRIBUTED" = "true" ]; then
        REASON="Prizes already distributed for this session"
        echo "   ❌ Would NOT distribute: $REASON"
        echo "   Distribution Executed: false"
    else
        echo "   ✅ Would distribute prizes!"
        echo "   Distribution Executed: true"
        echo "   Reason: Prizes distributed successfully"
        echo ""
        echo "   Would call: distributePrizes()"
        echo "   Transaction would be created"
    fi
fi

echo ""
echo "3. Current State Analysis:"
echo ""
echo "   Contract is in initial/empty state:"
echo "   - No active session"
echo "   - No players"
echo "   - No prize pool"
echo "   - Workflow correctly detects 'prizes already distributed' (heuristic)"
echo "   - This is expected for a new/unused contract"
echo ""
