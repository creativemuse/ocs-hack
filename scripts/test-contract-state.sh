#!/bin/bash

# Test script for TriviaBattle contract state
# Tests the contract state to verify workflow readiness

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contract addresses
CONTRACT="0xe72Fc03137A1412354ca97282071d173Ae592D96"
USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"

echo -e "${BLUE}🧪 Testing TriviaBattle Contract State${NC}"
echo -e "${BLUE}=====================================${NC}\n"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Contract: $CONTRACT"
echo "   Network: Base Sepolia"
echo "   RPC URL: $RPC_URL"
echo ""

# Function to call contract
call_contract() {
    local function_sig=$1
    local output_type=$2
    local description=$3
    
    echo -e "${BLUE}📊 $description${NC}"
    local result=$(cast call "$CONTRACT" "$function_sig" "$output_type" --rpc-url "$RPC_URL" 2>/dev/null || echo "ERROR")
    
    if [ "$result" = "ERROR" ]; then
        echo -e "${RED}   ❌ Failed to call contract${NC}"
        return 1
    else
        echo -e "${GREEN}   ✅ $description: $result${NC}"
        echo "$result"
        return 0
    fi
}

# Function to format timestamp
format_timestamp() {
    local timestamp=$1
    if command -v date &> /dev/null && [ ! -z "$timestamp" ] && [ "$timestamp" != "0" ]; then
        date -r "$timestamp" 2>/dev/null || echo "$timestamp"
    else
        echo "$timestamp"
    fi
}

# Test 1: Check owner
echo -e "${YELLOW}🔍 Test 1: Contract Owner${NC}"
OWNER=$(call_contract "owner()(address)" "address" "Owner address")
echo ""

# Test 2: Check session state
echo -e "${YELLOW}🔍 Test 2: Session State${NC}"
IS_ACTIVE=$(call_contract "isSessionActive()(bool)" "bool" "Session active")
echo ""

# Test 3: Check entry fee
echo -e "${YELLOW}🔍 Test 3: Entry Fee${NC}"
ENTRY_FEE=$(call_contract "entryFee()(uint256)" "uint256" "Entry fee (wei)")
ENTRY_FEE_USDC=$(echo "scale=6; $ENTRY_FEE / 1000000" | bc 2>/dev/null || echo "$ENTRY_FEE")
echo -e "   Entry fee: ${ENTRY_FEE_USDC} USDC (raw: $ENTRY_FEE wei)"
echo ""

# Test 4: Check session interval
echo -e "${YELLOW}🔍 Test 4: Session Interval${NC}"
SESSION_INTERVAL=$(call_contract "sessionInterval()(uint256)" "uint256" "Session interval (seconds)")
SESSION_INTERVAL_HOURS=$(echo "scale=2; $SESSION_INTERVAL / 3600" | bc 2>/dev/null || echo "$SESSION_INTERVAL")
echo -e "   Session interval: ${SESSION_INTERVAL_HOURS} hours (raw: $SESSION_INTERVAL seconds)"
echo ""

# Test 5: Check last session time
echo -e "${YELLOW}🔍 Test 5: Last Session Time${NC}"
LAST_SESSION=$(call_contract "lastSessionTime()(uint256)" "uint256" "Last session timestamp")
if [ "$LAST_SESSION" != "0" ]; then
    LAST_SESSION_DATE=$(format_timestamp "$LAST_SESSION")
    echo -e "   Last session: $LAST_SESSION_DATE (timestamp: $LAST_SESSION)"
else
    echo -e "   ${YELLOW}⚠️  No session has been started yet${NC}"
fi
echo ""

# Test 6: Check current players
echo -e "${YELLOW}🔍 Test 6: Current Players${NC}"
PLAYERS=$(cast call "$CONTRACT" "getCurrentPlayers()(address[])" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
if [ -z "$PLAYERS" ] || [ "$PLAYERS" = "[]" ]; then
    echo -e "   ${YELLOW}⚠️  No players have joined yet${NC}"
    PLAYER_COUNT=0
else
    # Count players (approximate - count commas and add 1)
    PLAYER_COUNT=$(echo "$PLAYERS" | grep -o "," | wc -l | xargs)
    PLAYER_COUNT=$((PLAYER_COUNT + 1))
    echo -e "   ${GREEN}✅ Found $PLAYER_COUNT player(s)${NC}"
    echo "   Players: $PLAYERS"
fi
echo ""

# Test 7: Check prize pool (USDC balance)
echo -e "${YELLOW}🔍 Test 7: Prize Pool (Contract USDC Balance)${NC}"
PRIZE_POOL=$(call_contract "getContractUsdcBalance()(uint256)" "uint256" "Prize pool (wei)")
if [ "$PRIZE_POOL" != "0" ]; then
    PRIZE_POOL_USDC=$(echo "scale=6; $PRIZE_POOL / 1000000" | bc 2>/dev/null || echo "$PRIZE_POOL")
    echo -e "   Prize pool: ${PRIZE_POOL_USDC} USDC (raw: $PRIZE_POOL wei)"
else
    echo -e "   ${YELLOW}⚠️  Prize pool is empty${NC}"
fi
echo ""

# Test 8: Check session counter
echo -e "${YELLOW}🔍 Test 8: Session Counter${NC}"
SESSION_COUNTER=$(call_contract "sessionCounter()(uint256)" "uint256" "Session counter")
echo ""

# Test 9: Check USDC token address
echo -e "${YELLOW}🔍 Test 9: USDC Token Address${NC}"
USDC_TOKEN=$(call_contract "USDC_TOKEN()(address)" "address" "USDC token address")
if [ "$USDC_TOKEN" = "$USDC" ]; then
    echo -e "   ${GREEN}✅ USDC address matches expected: $USDC${NC}"
else
    echo -e "   ${YELLOW}⚠️  USDC address differs: $USDC_TOKEN (expected: $USDC)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}===============${NC}"
echo ""
echo -e "Contract Address: $CONTRACT"
echo -e "Owner: $OWNER"
echo -e "Session Active: $IS_ACTIVE"
echo -e "Entry Fee: $ENTRY_FEE_USDC USDC"
echo -e "Session Interval: $SESSION_INTERVAL_HOURS hours"
echo -e "Last Session: ${LAST_SESSION_DATE:-Never}"
echo -e "Current Players: $PLAYER_COUNT"
echo -e "Prize Pool: ${PRIZE_POOL_USDC:-0} USDC"
echo -e "Session Counter: $SESSION_COUNTER"
echo ""

# Analysis
echo -e "${BLUE}🔍 Analysis${NC}"
echo -e "${BLUE}===========${NC}"
echo ""

if [ "$IS_ACTIVE" = "false" ] && [ "$PRIZE_POOL" = "0" ] && [ "$PLAYER_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  STATUS: No Activity Yet${NC}"
    echo ""
    echo "The contract is in its initial state:"
    echo "  • No session has been started"
    echo "  • No players have joined"
    echo "  • No prize pool exists"
    echo ""
    echo "This explains why the CRE workflow detected 'prizes already distributed'"
    echo "The workflow uses a heuristic that incorrectly assumes prizes were"
    echo "distributed when there's actually no activity yet."
    echo ""
    echo -e "${GREEN}✅ To test the workflow:${NC}"
    echo "  1. Start a session: cast send $CONTRACT \"startNewSession()\" --rpc-url $RPC_URL --private-key \$PRIVATE_KEY"
    echo "  2. Have players join: cast send $CONTRACT \"joinBattle()\" --rpc-url $RPC_URL --private-key \$PLAYER_PRIVATE_KEY"
    echo "  3. Wait for session to end or manually end it"
    echo "  4. The workflow should then distribute prizes on the next execution"
elif [ "$IS_ACTIVE" = "true" ]; then
    echo -e "${GREEN}✅ STATUS: Session Active${NC}"
    echo ""
    echo "There is an active session with:"
    echo "  • $PLAYER_COUNT player(s)"
    echo "  • Prize pool: ${PRIZE_POOL_USDC:-0} USDC"
    echo ""
    echo "The workflow will check again when the session ends."
elif [ "$IS_ACTIVE" = "false" ] && [ "$PRIZE_POOL" != "0" ]; then
    echo -e "${GREEN}✅ STATUS: Session Ended, Prizes Pending Distribution${NC}"
    echo ""
    echo "The session has ended with:"
    echo "  • $PLAYER_COUNT player(s)"
    echo "  • Prize pool: ${PRIZE_POOL_USDC} USDC"
    echo ""
    echo "The workflow should distribute prizes on the next execution (Sunday 00:00 UTC)."
    echo "Or you can manually trigger distribution now."
else
    echo -e "${GREEN}✅ STATUS: Contract is functioning${NC}"
    echo ""
    echo "Contract state appears normal."
fi

echo ""
