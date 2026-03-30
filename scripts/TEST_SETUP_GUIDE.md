# Test Setup Guide for TriviaBattle Contract

This guide helps you set up test accounts and run end-to-end tests of the TriviaBattle contract and CRE workflow.

## Prerequisites

1. **Contract Owner Private Key** - For starting sessions
2. **Test Player Wallet** - For joining battles (can use your other wallet)
3. **Test Funds**:
   - Owner: Needs ETH for gas fees
   - Player: Needs ETH for gas + 1+ USDC for entry fee

## Address Summary

- **Contract Address**: `0xe72Fc03137A1412354ca97282071d173Ae592D96`
- **Contract Owner**: `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Network**: Base Sepolia (Chain ID: 84532)
- **RPC URL**: https://sepolia.base.org

## Step 1: Set Up Environment Variables

Add to your `.env` file:

```bash
# Contract owner private key (for starting sessions)
CONTRACT_OWNER_PRIVATE_KEY=your_owner_private_key_here

# Test player private key (for joining battles)
TEST_PLAYER_PRIVATE_KEY=your_player_private_key_here

# Or if you want to use your current wallet as player
# TEST_PLAYER_PRIVATE_KEY=your_current_wallet_private_key

# RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

## Step 2: Check Current Balances

Run the setup script to check balances:

```bash
bash scripts/setup-test-accounts.sh
```

Or manually check:

```bash
# Check owner ETH
cast balance 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 --rpc-url https://sepolia.base.org

# Check owner USDC
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 \
  --rpc-url https://sepolia.base.org

# Check player ETH
cast balance 0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260 --rpc-url https://sepolia.base.org

# Check player USDC (you have 2 USDC already!)
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260 \
  --rpc-url https://sepolia.base.org
```

## Step 3: Get Test Funds (If Needed)

### Get Base Sepolia ETH:
- **Coinbase Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Alchemy Faucet**: https://www.alchemy.com/faucets/base-sepolia
- **QuickNode Faucet**: https://faucet.quicknode.com/base/sepolia

### Get Base Sepolia USDC:
- You already have 2 USDC in wallet `0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260` ✅
- Or transfer from another wallet that has USDC
- Or use a USDC faucet/bridge

## Step 4: Run Full Test

Once your `.env` is configured, run:

```bash
bash scripts/run-full-test.sh
```

This will:
1. ✅ Check current contract state
2. ✅ Start a new session (if none active)
3. ✅ Join battle as a test player
4. ✅ Verify player joined and prize pool increased
5. ✅ Show final state and next steps

## Step 5: Manual Test (Alternative)

If you prefer manual control:

### A. Start Session (Owner)

```bash
cast send 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "startNewSession()" \
  --rpc-url https://sepolia.base.org \
  --private-key $CONTRACT_OWNER_PRIVATE_KEY
```

### B. Join Battle (Player)

```bash
# 1. Approve USDC
cast send 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "approve(address,uint256)" \
  0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  1000000 \
  --rpc-url https://sepolia.base.org \
  --private-key $TEST_PLAYER_PRIVATE_KEY

# 2. Join battle
cast send 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "joinBattle()" \
  --rpc-url https://sepolia.base.org \
  --private-key $TEST_PLAYER_PRIVATE_KEY
```

### C. Verify

```bash
# Check players
cast call 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "getCurrentPlayers()(address[])" \
  --rpc-url https://sepolia.base.org

# Check prize pool
cast call 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  "getContractUsdcBalance()(uint256)" \
  --rpc-url https://sepolia.base.org
```

## Step 6: Test CRE Workflow

Once players have joined and session ends:

### Option A: Wait for Automatic Execution
- Workflow runs every **Sunday at 00:00 UTC**
- Will automatically distribute prizes when conditions are met

### Option B: Simulate Locally (Immediate)

```bash
cd chainlink-cre-workflows
cre workflow simulate weekly-prize-distribution --target staging-settings
```

This tests the workflow logic without actually executing on-chain.

### Option C: Check Workflow Status

1. Visit CRE Dashboard: https://cre.chain.link
2. Find workflow: `weekly-prize-dist-stg`
3. View logs and execution history

## Step 7: Verify Prize Distribution

After workflow executes, check:

### On Basescan:
1. Visit: https://sepolia.basescan.org/address/0xe72Fc03137A1412354ca97282071d173Ae592D96#events
2. Look for `PrizesDistributed` event
3. Check transaction details

### Via Cast:
```bash
# Get recent events (adjust block range as needed)
cast logs \
  --address 0xe72Fc03137A1412354ca97282071d173Ae592D96 \
  --from-block latest-1000 \
  --to-block latest \
  --rpc-url https://sepolia.base.org | grep -i "PrizesDistributed"
```

## Troubleshooting

### "Insufficient funds"
- Get more test ETH from faucets
- Get more USDC (need 1 USDC per join)

### "Session already active"
- Wait for current session to end (7 days)
- Or manually end it if function exists

### "Player already joined"
- Player can only join once per session
- Wait for next session

### Workflow says "Prizes already distributed"
- Check if prizes were actually distributed on Basescan
- The heuristic might be incorrect (see workflow code)

## Quick Reference

**Contract Functions:**
- `startNewSession()` - Owner only, starts new 7-day session
- `joinBattle()` - Anyone, pays 1 USDC entry fee
- `distributePrizes()` - Owner or Chainlink, distributes prizes
- `getCurrentPlayers()` - View function, returns player addresses
- `getContractUsdcBalance()` - View function, returns prize pool

**Session Info:**
- Session Interval: 7 days (604,800 seconds)
- Entry Fee: 1 USDC (1,000,000 wei)
- Minimum Players: 1 (from contract constants)

## Next Steps After Testing

1. ✅ Test full flow works
2. ✅ Verify workflow distributes prizes
3. ✅ Check events on Basescan
4. ✅ Deploy to production when ready
