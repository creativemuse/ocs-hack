#!/bin/bash

# Full end-to-end test script for TriviaBattle contract
# Assumes test accounts are already set up with funds

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Contract addresses
CONTRACT="0xe72Fc03137A1412354ca97282071d173Ae592D96"
USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check required keys
if [ -z "$PRIVATE_KEY" ] && [ -z "$CONTRACT_OWNER_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ ERROR: PRIVATE_KEY or CONTRACT_OWNER_PRIVATE_KEY not found${NC}"
    echo "   Please set in .env file"
    exit 1
fi

OWNER_KEY="${CONTRACT_OWNER_PRIVATE_KEY:-$PRIVATE_KEY}"

if [ -z "$TEST_PLAYER_PRIVATE_KEY" ]; then
    echo -e "${YELLOW}⚠️  TEST_PLAYER_PRIVATE_KEY not found${NC}"
    echo "   Running owner operations only"
    PLAYER_KEY=""
else
    PLAYER_KEY="$TEST_PLAYER_PRIVATE_KEY"
fi

echo -e "${BLUE}🧪 Running Full TriviaBattle Test${NC}"
echo -e "${BLUE}===================================${NC}\n"

# Function to wait for transaction
wait_for_tx() {
    local tx_hash=$1
    echo -e "${CYAN}⏳ Waiting for transaction: $tx_hash${NC}"
    cast receipt "$tx_hash" --rpc-url "$RPC_URL" > /dev/null 2>&1
    echo -e "${GREEN}✅ Transaction confirmed${NC}\n"
}

# Step 1: Check current state
echo -e "${YELLOW}📋 Step 1: Checking Current State${NC}"
SESSION_ACTIVE=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
PLAYERS=$(cast call "$CONTRACT" "getCurrentPlayers()(address[])" --rpc-url "$RPC_URL")
PRIZE_POOL=$(cast call "$CONTRACT" "getContractUsdcBalance()(uint256)" --rpc-url "$RPC_URL")

echo "   Session Active: $SESSION_ACTIVE"
echo "   Current Players: $PLAYERS"
echo "   Prize Pool: $PRIZE_POOL wei"
echo ""

# Step 2: Start session if not active
if [ "$SESSION_ACTIVE" = "false" ]; then
    echo -e "${YELLOW}📋 Step 2: Starting New Session${NC}"
    echo -e "${CYAN}Sending startNewSession() transaction...${NC}"
    
    TX_HASH=$(cast send "$CONTRACT" \
        "startNewSession()" \
        --rpc-url "$RPC_URL" \
        --private-key "$OWNER_KEY" \
        --json 2>/dev/null | jq -r '.transactionHash' || echo "")
    
    if [ ! -z "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
        wait_for_tx "$TX_HASH"
        
        # Verify session started
        NEW_SESSION_ACTIVE=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
        if [ "$NEW_SESSION_ACTIVE" = "true" ]; then
            echo -e "${GREEN}✅ Session started successfully${NC}\n"
        else
            echo -e "${RED}❌ Session start failed${NC}\n"
            exit 1
        fi
    else
        echo -e "${RED}❌ Failed to start session${NC}\n"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Session already active, skipping start${NC}\n"
fi

# Step 3: Join as player (if player key available)
if [ ! -z "$PLAYER_KEY" ]; then
    PLAYER_ADDRESS=$(cast wallet address --private-key "$PLAYER_KEY")
    echo -e "${YELLOW}📋 Step 3: Joining Battle as Player${NC}"
    echo -e "   Player Address: $PLAYER_ADDRESS"
    
    # Check if already joined
    PLAYERS_LIST=$(cast call "$CONTRACT" "getCurrentPlayers()(address[])" --rpc-url "$RPC_URL")
    if echo "$PLAYERS_LIST" | grep -qi "$(echo $PLAYER_ADDRESS | tr '[:upper:]' '[:lower:]')"; then
        echo -e "${GREEN}✅ Player already joined${NC}\n"
    else
        # Check USDC balance
        USDC_BALANCE=$(cast call "$USDC" "balanceOf(address)(uint256)" "$PLAYER_ADDRESS" --rpc-url "$RPC_URL" || echo "0")
        ENTRY_FEE=1000000  # 1 USDC
        
        if [ "$USDC_BALANCE" -lt "$ENTRY_FEE" ]; then
            echo -e "${RED}❌ Insufficient USDC balance${NC}"
            echo "   Required: $ENTRY_FEE wei (1 USDC)"
            echo "   Current: $USDC_BALANCE wei"
            echo -e "${YELLOW}   Please get test USDC first${NC}\n"
            exit 1
        fi
        
        # Check allowance
        ALLOWANCE=$(cast call "$USDC" "allowance(address,address)(uint256)" "$PLAYER_ADDRESS" "$CONTRACT" --rpc-url "$RPC_URL" || echo "0")
        
        if [ "$ALLOWANCE" -lt "$ENTRY_FEE" ]; then
            echo -e "${CYAN}Step 3a: Approving USDC spending...${NC}"
            TX_HASH=$(cast send "$USDC" \
                "approve(address,uint256)" \
                "$CONTRACT" \
                "$ENTRY_FEE" \
                --rpc-url "$RPC_URL" \
                --private-key "$PLAYER_KEY" \
                --json 2>/dev/null | jq -r '.transactionHash' || echo "")
            
            if [ ! -z "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
                wait_for_tx "$TX_HASH"
                echo -e "${GREEN}✅ USDC approved${NC}\n"
            else
                echo -e "${RED}❌ Approval failed${NC}\n"
                exit 1
            fi
        else
            echo -e "${GREEN}✅ USDC already approved${NC}\n"
        fi
        
        # Join battle
        echo -e "${CYAN}Step 3b: Joining battle...${NC}"
        TX_HASH=$(cast send "$CONTRACT" \
            "joinBattle()" \
            --rpc-url "$RPC_URL" \
            --private-key "$PLAYER_KEY" \
            --json 2>/dev/null | jq -r '.transactionHash' || echo "")
        
        if [ ! -z "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
            wait_for_tx "$TX_HASH"
            
            # Verify player joined
            NEW_PLAYERS=$(cast call "$CONTRACT" "getCurrentPlayers()(address[])" --rpc-url "$RPC_URL")
            NEW_PRIZE_POOL=$(cast call "$CONTRACT" "getContractUsdcBalance()(uint256)" --rpc-url "$RPC_URL")
            
            if echo "$NEW_PLAYERS" | grep -qi "$(echo $PLAYER_ADDRESS | tr '[:upper:]' '[:lower:]')"; then
                echo -e "${GREEN}✅ Player joined successfully${NC}"
                echo "   Players: $NEW_PLAYERS"
                echo "   Prize Pool: $NEW_PRIZE_POOL wei"
                echo ""
            else
                echo -e "${RED}❌ Failed to join${NC}\n"
                exit 1
            fi
        else
            echo -e "${RED}❌ Join transaction failed${NC}\n"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  No player key provided, skipping join step${NC}"
    echo "   Set TEST_PLAYER_PRIVATE_KEY in .env to test player joining\n"
fi

# Step 4: Final state
echo -e "${YELLOW}📋 Step 4: Final State${NC}"
FINAL_SESSION=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
FINAL_PLAYERS=$(cast call "$CONTRACT" "getCurrentPlayers()(address[])" --rpc-url "$RPC_URL")
FINAL_PRIZE_POOL=$(cast call "$CONTRACT" "getContractUsdcBalance()(uint256)" --rpc-url "$RPC_URL")
LAST_SESSION_TIME=$(cast call "$CONTRACT" "lastSessionTime()(uint256)" --rpc-url "$RPC_URL")
SESSION_INTERVAL=$(cast call "$CONTRACT" "sessionInterval()(uint256)" --rpc-url "$RPC_URL")

echo "   Session Active: $FINAL_SESSION"
echo "   Current Players: $FINAL_PLAYERS"
echo "   Prize Pool: $FINAL_PRIZE_POOL wei"
echo "   Last Session Time: $LAST_SESSION_TIME"
echo "   Session Interval: $SESSION_INTERVAL seconds"
echo ""

# Calculate session end time
if [ "$LAST_SESSION_TIME" != "0" ]; then
    SESSION_END=$((LAST_SESSION_TIME + SESSION_INTERVAL))
    SESSION_END_DATE=$(date -r "$SESSION_END" 2>/dev/null || echo "$SESSION_END")
    echo "   Session End Time: $SESSION_END_DATE"
    echo ""
fi

# Step 5: Next steps
echo -e "${YELLOW}📋 Step 5: Next Steps${NC}"
echo ""
echo -e "${CYAN}To test prize distribution:${NC}"
echo "   1. Wait for session to end (or manually end if function exists)"
echo "   2. The CRE workflow will automatically run on Sunday 00:00 UTC"
echo "   3. Or manually simulate: cd chainlink-cre-workflows && cre workflow simulate weekly-prize-distribution --target staging-settings"
echo ""
echo -e "${CYAN}To check for PrizesDistributed events:${NC}"
echo "   Visit: https://sepolia.basescan.org/address/$CONTRACT#events"
echo "   Filter by: PrizesDistributed"
echo ""

echo -e "${GREEN}✅ Test setup complete!${NC}"
echo ""
