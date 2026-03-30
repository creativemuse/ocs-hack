#!/bin/bash

# Comprehensive test setup script for TriviaBattle contract
# Sets up test accounts and helps get test USDC

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

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo -e "${BLUE}🧪 TriviaBattle Test Setup${NC}"
echo -e "${BLUE}===========================${NC}\n"

# Function to check balance
check_balance() {
    local address=$1
    local token=$2
    local label=$3
    
    echo -e "${CYAN}Checking $label balance...${NC}"
    
    if [ -z "$token" ] || [ "$token" = "ETH" ]; then
        # Check ETH balance
        local balance=$(cast balance "$address" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
        local balance_eth=$(echo "scale=6; $balance / 1000000000000000000" | bc 2>/dev/null || echo "0")
        echo -e "   ${GREEN}ETH Balance: $balance_eth ETH${NC} (wei: $balance)"
    else
        # Check USDC balance
        local balance=$(cast call "$token" "balanceOf(address)(uint256)" "$address" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
        if [ "$balance" != "0" ] && [ "$balance" != "ERROR" ]; then
            local balance_usdc=$(echo "scale=6; $balance / 1000000" | bc 2>/dev/null || echo "$balance")
            echo -e "   ${GREEN}USDC Balance: $balance_usdc USDC${NC} (wei: $balance)"
        else
            echo -e "   ${RED}USDC Balance: 0 USDC${NC}"
        fi
    fi
    echo ""
}

# Function to get wallet address from private key
get_address_from_key() {
    local private_key=$1
    if [ ! -z "$private_key" ]; then
        cast wallet address --private-key "$private_key" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Step 1: Check owner wallet
echo -e "${YELLOW}📋 Step 1: Checking Owner Wallet${NC}"
if [ -z "$PRIVATE_KEY" ] && [ -z "$CONTRACT_OWNER_PRIVATE_KEY" ]; then
    echo -e "${YELLOW}⚠️  No PRIVATE_KEY or CONTRACT_OWNER_PRIVATE_KEY found in environment${NC}"
    echo "   Using known owner address: 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294"
    OWNER_ADDRESS="0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294"
else
    OWNER_KEY="${CONTRACT_OWNER_PRIVATE_KEY:-$PRIVATE_KEY}"
    OWNER_ADDRESS=$(get_address_from_key "$OWNER_KEY")
    if [ -z "$OWNER_ADDRESS" ]; then
        echo -e "${RED}❌ Invalid private key${NC}"
        exit 1
    fi
fi

echo -e "   Owner Address: $OWNER_ADDRESS"
check_balance "$OWNER_ADDRESS" "ETH" "Owner"
check_balance "$OWNER_ADDRESS" "$USDC" "Owner"

# Verify this is the contract owner
CONTRACT_OWNER=$(cast call "$CONTRACT" "owner()(address)" --rpc-url "$RPC_URL")
if [ "$OWNER_ADDRESS" != "$(echo $CONTRACT_OWNER | tr '[:upper:]' '[:lower:]')" ]; then
    echo -e "${YELLOW}⚠️  Warning: Address $OWNER_ADDRESS does not match contract owner: $CONTRACT_OWNER${NC}\n"
else
    echo -e "${GREEN}✅ Address matches contract owner${NC}\n"
fi

# Step 2: Check or create test player wallet
echo -e "${YELLOW}📋 Step 2: Setting Up Test Player Wallet${NC}"
if [ -z "$TEST_PLAYER_PRIVATE_KEY" ]; then
    echo -e "${CYAN}Creating a new test player wallet...${NC}"
    TEST_PLAYER_KEY=$(cast wallet new --unsafe 2>/dev/null | head -n 1 | awk '{print $2}' || echo "")
    if [ ! -z "$TEST_PLAYER_KEY" ]; then
        TEST_PLAYER_ADDRESS=$(get_address_from_key "$TEST_PLAYER_KEY")
        echo -e "${GREEN}✅ Created test player wallet${NC}"
        echo -e "   ${YELLOW}⚠️  SAVE THIS PRIVATE KEY: $TEST_PLAYER_KEY${NC}"
        echo -e "   Address: $TEST_PLAYER_ADDRESS"
        echo -e "   ${CYAN}Add to .env: TEST_PLAYER_PRIVATE_KEY=$TEST_PLAYER_KEY${NC}"
    else
        echo -e "${RED}❌ Failed to create wallet. Using manual address.${NC}"
        TEST_PLAYER_ADDRESS=""
    fi
else
    TEST_PLAYER_ADDRESS=$(get_address_from_key "$TEST_PLAYER_PRIVATE_KEY")
    echo -e "   Test Player Address: $TEST_PLAYER_ADDRESS"
fi

if [ ! -z "$TEST_PLAYER_ADDRESS" ]; then
    check_balance "$TEST_PLAYER_ADDRESS" "ETH" "Test Player"
    check_balance "$TEST_PLAYER_ADDRESS" "$USDC" "Test Player"
fi

echo ""

# Step 3: Getting Test Funds
echo -e "${YELLOW}📋 Step 3: Getting Test Funds${NC}"
echo ""

echo -e "${CYAN}💰 Getting Base Sepolia ETH:${NC}"
echo "   Owner needs ETH for gas fees:"
echo -e "   ${GREEN}1. Coinbase Faucet:${NC} https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
echo -e "   ${GREEN}2. Alchemy Faucet:${NC} https://www.alchemy.com/faucets/base-sepolia"
echo -e "   ${GREEN}3. QuickNode Faucet:${NC} https://faucet.quicknode.com/base/sepolia"
echo ""
echo "   Addresses that need ETH:"
echo "   • Owner: $OWNER_ADDRESS"
if [ ! -z "$TEST_PLAYER_ADDRESS" ]; then
    echo "   • Test Player: $TEST_PLAYER_ADDRESS"
fi
echo ""

echo -e "${CYAN}💵 Getting Base Sepolia USDC:${NC}"
echo "   USDC is needed to join battles (1 USDC entry fee)"
echo ""
echo -e "   ${YELLOW}Option 1: Transfer from another wallet${NC}"
echo "   If you have USDC on Base Sepolia mainnet, you can bridge or transfer it"
echo ""
echo -e "   ${YELLOW}Option 2: Use a USDC faucet or bridge${NC}"
echo "   Search for 'Base Sepolia USDC faucet' or bridge from Ethereum Sepolia"
echo ""
echo -e "   ${YELLOW}Option 3: Mint test USDC (if you have access)${NC}"
echo "   USDC Contract: $USDC"
echo "   You can interact with the USDC contract directly if you have deployer privileges"
echo ""
echo "   Addresses that need USDC:"
if [ ! -z "$TEST_PLAYER_ADDRESS" ]; then
    echo "   • Test Player: $TEST_PLAYER_ADDRESS (need at least 1 USDC)"
fi
echo ""

# Step 4: Contract State Check
echo -e "${YELLOW}📋 Step 4: Current Contract State${NC}"
SESSION_ACTIVE=$(cast call "$CONTRACT" "isSessionActive()(bool)" --rpc-url "$RPC_URL")
PLAYERS=$(cast call "$CONTRACT" "getCurrentPlayers()(address[])" --rpc-url "$RPC_URL")
PRIZE_POOL=$(cast call "$CONTRACT" "getContractUsdcBalance()(uint256)" --rpc-url "$RPC_URL")
SESSION_COUNTER=$(cast call "$CONTRACT" "sessionCounter()(uint256)" --rpc-url "$RPC_URL")

echo "   Session Active: $SESSION_ACTIVE"
echo "   Current Players: $PLAYERS"
echo "   Prize Pool: $PRIZE_POOL wei"
echo "   Session Counter: $SESSION_COUNTER"
echo ""

# Step 5: Next Steps
echo -e "${YELLOW}📋 Step 5: Next Steps to Test${NC}"
echo ""

if [ "$SESSION_ACTIVE" = "false" ]; then
    echo -e "${CYAN}1. Start a session (Owner only):${NC}"
    echo "   cast send $CONTRACT \\"
    echo "     \"startNewSession()\" \\"
    echo "     --rpc-url $RPC_URL \\"
    if [ ! -z "$OWNER_KEY" ]; then
        echo "     --private-key $OWNER_KEY"
    else
        echo "     --private-key \$OWNER_PRIVATE_KEY"
    fi
    echo ""
fi

if [ "$SESSION_ACTIVE" = "true" ]; then
    echo -e "${CYAN}2. Join battle (Player):${NC}"
else
    echo -e "${CYAN}2. After starting session, join battle (Player):${NC}"
fi

echo ""
echo -e "${CYAN}   Step 2a: Approve USDC spending${NC}"
echo "   cast send $USDC \\"
echo "     \"approve(address,uint256)\" \\"
echo "     $CONTRACT \\"
echo "     1000000 \\"
echo "     --rpc-url $RPC_URL \\"
if [ ! -z "$TEST_PLAYER_KEY" ]; then
    echo "     --private-key $TEST_PLAYER_KEY"
else
    echo "     --private-key \$TEST_PLAYER_PRIVATE_KEY"
fi
echo ""

echo -e "${CYAN}   Step 2b: Join the battle${NC}"
echo "   cast send $CONTRACT \\"
echo "     \"joinBattle()\" \\"
echo "     --rpc-url $RPC_URL \\"
if [ ! -z "$TEST_PLAYER_KEY" ]; then
    echo "     --private-key $TEST_PLAYER_KEY"
else
    echo "     --private-key \$TEST_PLAYER_PRIVATE_KEY"
fi
echo ""

echo -e "${CYAN}3. Verify player joined:${NC}"
echo "   cast call $CONTRACT \"getCurrentPlayers()(address[])\" --rpc-url $RPC_URL"
echo "   cast call $CONTRACT \"getContractUsdcBalance()(uint256)\" --rpc-url $RPC_URL"
echo ""

echo -e "${CYAN}4. Wait for session to end or manually trigger workflow:${NC}"
echo "   • Session interval: 7 days (604,800 seconds)"
echo "   • Workflow runs every Sunday at 00:00 UTC"
echo "   • Or manually test workflow: cd chainlink-cre-workflows && cre workflow simulate weekly-prize-distribution --target staging-settings"
echo ""

# Summary
echo -e "${BLUE}📊 Setup Summary${NC}"
echo -e "${BLUE}===============${NC}"
echo ""
echo -e "Contract Address: $CONTRACT"
echo -e "Owner Address: $OWNER_ADDRESS"
if [ ! -z "$TEST_PLAYER_ADDRESS" ]; then
    echo -e "Test Player Address: $TEST_PLAYER_ADDRESS"
    if [ ! -z "$TEST_PLAYER_KEY" ]; then
        echo -e "${YELLOW}Test Player Private Key: $TEST_PLAYER_KEY${NC}"
        echo -e "${CYAN}💡 Add this to your .env file:${NC}"
        echo "   TEST_PLAYER_PRIVATE_KEY=$TEST_PLAYER_KEY"
    fi
fi
echo ""

echo -e "${GREEN}✅ Setup script complete!${NC}"
echo ""
echo -e "${YELLOW}Next:${NC}"
echo "  1. Get test ETH from faucets listed above"
echo "  2. Get test USDC (1+ USDC needed per player)"
echo "  3. Start a session using the commands above"
echo "  4. Join as a player using the commands above"
echo "  5. Wait for workflow to distribute prizes"
echo ""
