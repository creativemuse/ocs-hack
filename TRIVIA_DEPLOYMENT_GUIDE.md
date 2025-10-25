# TriviaBattlev2 Deployment Guide

## 🎯 Overview

Your TriviaBattlev2 contract is **already automation-compatible**! This guide walks you through deploying it with Chainlink Automation for automatic game finalization.

## 📋 Prerequisites

### 1. Environment Setup

Create your `.env` file:

```bash
cp env.example .env
```

**Required Variables:**
```bash
# Your deployer wallet (needs ETH for gas)
PRIVATE_KEY=your_private_key_here

# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Contract Configuration
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Sepolia
GAME_ORACLE_ADDRESS=0xYourOracleWallet
PLATFORM_FEE_RECIPIENT=0xYourFeeRecipient

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Get Testnet Tokens

**Sepolia ETH:** https://sepoliafaucet.com/
**Sepolia LINK:** https://faucets.chain.link/sepolia
**Sepolia USDC:** https://faucets.chain.link/sepolia

## 🚀 Deployment Steps

### Step 1: Deploy to Sepolia (Testnet)

```bash
# One-command deployment
./deploy-trivia-sepolia.sh
```

**What happens:**
1. ✅ Builds your contracts
2. ✅ Deploys TriviaGame to Sepolia
3. ✅ Shows contract address
4. ✅ Provides next steps

### Step 2: Register Chainlink Automation

1. **Go to:** https://automation.chain.link/sepolia
2. **Click:** "Register new Upkeep"
3. **Select:** "Custom logic" trigger
4. **Paste:** Your contract address
5. **Set gas limit:** 500,000
6. **Fund with:** 10 LINK tokens
7. **Confirm:** Transaction

### Step 3: Test the Game Flow

```bash
# 1. Create a new game
cast send <CONTRACT_ADDRESS> "createGame()" --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

# 2. Players enter (need USDC first)
cast send <USDC_ADDRESS> "approve(address,uint256)" <CONTRACT_ADDRESS> 1000000 --rpc-url $SEPOLIA_RPC_URL --private-key $PLAYER_KEY
cast send <CONTRACT_ADDRESS> "enterGame()" --rpc-url $SEPOLIA_RPC_URL --private-key $PLAYER_KEY

# 3. Wait 5 minutes for game to end

# 4. Oracle submits rankings
cast send <CONTRACT_ADDRESS> "submitRankings(uint256,address[])" <GAME_ID> "[player1,player2,player3]" --rpc-url $SEPOLIA_RPC_URL --private-key $ORACLE_KEY

# 5. Watch Chainlink auto-finalize! 🤖

# 6. Winners claim prizes
cast send <CONTRACT_ADDRESS> "claimPrize(uint256)" <GAME_ID> --rpc-url $SEPOLIA_RPC_URL --private-key $WINNER_KEY
```

## 🎮 Game Flow with Automation

```
┌─────────────────────────────────────────┐
│ 1. Owner calls createGame()             │
│    → Game starts, 5-minute timer       │
│    → Players can now enter              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 2. Players call enterGame()             │
│    → Pay 1 USDC entry fee               │
│    → Join current game                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 3. Game runs for 5 minutes              │
│    → Players play trivia                │
│    → Backend tracks scores              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 4. Game ends (5 minutes pass)           │
│    → Players finish, waiting for ranks  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 5. Oracle calls submitRankings()         │
│    → Rankings stored on-chain           │
│    → rankingsSubmitted = true           │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 6. 🤖 CHAINLINK AUTOMATION KICKS IN     │
│    → checkUpkeep() returns TRUE         │
│    → Chainlink calls performUpkeep()    │
│    → Game AUTOMATICALLY finalized! ✅   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 7. Winners call claimPrize()               │
│    → Receive USDC prizes automatically   │
└─────────────────────────────────────────┘
```

## 🔧 Contract Functions

### Owner Functions
```solidity
createGame()                    // Start new game
manuallyFinalizeGame(gameId)    // Fallback if automation fails
withdrawPlatformFees()          // Withdraw 3% platform fees
updateOracle(newOracle)         // Update oracle address
updatePlatformFeeRecipient()    // Update fee recipient
```

### Player Functions
```solidity
enterGame()                     // Join current game (pay 1 USDC)
claimPrize(gameId)              // Claim winnings after game ends
```

### Oracle Functions
```solidity
submitRankings(gameId, players) // Submit final rankings
```

### View Functions
```solidity
getGameInfo(gameId)             // Get game details
getTimeRemaining()              // Time left in current game
isGameReadyToFinalize(gameId)   // Check if ready for automation
canCreateNewGame()              // Check if new game can start
```

## 💰 Prize Distribution

**Total Prize Pool:** 97% of entry fees (3% platform fee)

**Top 3 Winners:**
- 🥇 **1st Place:** 47.5% of total (50% of 95%)
- 🥈 **2nd Place:** 28.5% of total (30% of 95%)
- 🥉 **3rd Place:** 19% of total (20% of 95%)

**4th-10th Place:** Split remaining 5% equally

**Example with 10 players (10 USDC total):**
- Platform fee: 0.3 USDC
- Prize pool: 9.7 USDC
- 1st place: ~4.6 USDC
- 2nd place: ~2.8 USDC
- 3rd place: ~1.8 USDC
- 4th-10th: ~0.1 USDC each

## 🔍 Monitoring Your Contract

### Check Game Status
```bash
# Current game info
cast call <CONTRACT_ADDRESS> "getGameInfo(uint256)" <GAME_ID> --rpc-url $SEPOLIA_RPC_URL

# Time remaining
cast call <CONTRACT_ADDRESS> "getTimeRemaining()" --rpc-url $SEPOLIA_RPC_URL

# Ready to finalize?
cast call <CONTRACT_ADDRESS> "isGameReadyToFinalize(uint256)" <GAME_ID> --rpc-url $SEPOLIA_RPC_URL
```

### Check Automation Status
- **Dashboard:** https://automation.chain.link/sepolia
- **Monitor:** Execution history, gas usage, LINK balance
- **Alerts:** Set up low balance notifications

## 🚨 Troubleshooting

### Game Not Finalizing?
1. ✅ Check LINK balance in automation dashboard
2. ✅ Verify upkeep is "Active" not "Paused"
3. ✅ Confirm rankings were submitted
4. ✅ Check game end time has passed
5. ✅ Use `manuallyFinalizeGame()` as fallback

### Players Can't Enter?
1. ✅ Check if game is active
2. ✅ Verify USDC approval and balance
3. ✅ Ensure game hasn't ended
4. ✅ Check entry fee (1 USDC)

### Oracle Issues?
1. ✅ Verify oracle address is correct
2. ✅ Check oracle has sufficient ETH for gas
3. ✅ Ensure rankings are submitted after game ends
4. ✅ Validate all ranked players actually entered

## 📊 Cost Estimates

### Per Game Finalization
- **Gas used:** ~100,000 - 200,000
- **LINK cost:** ~0.03 - 0.05 LINK
- **Frequency:** Once per game (when rankings submitted)

### Daily Operations (100 games)
- **Games per day:** 100
- **LINK needed:** 3-5 LINK
- **Monthly cost:** ~90-150 LINK

### Platform Revenue
- **Entry fee:** 1 USDC per player
- **Platform fee:** 3% = 0.03 USDC per player
- **100 players/day:** 3 USDC daily revenue
- **Monthly revenue:** ~90 USDC

## 🎯 Production Deployment

### When Ready for Mainnet:

1. **Deploy to Mainnet:**
   ```bash
   ./deploy-trivia-mainnet.sh
   ```

2. **Update Configuration:**
   ```bash
   # Mainnet USDC address
   USDC_ADDRESS=0xA0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C
   ```

3. **Register on Mainnet:**
   - Go to: https://automation.chain.link/mainnet
   - Same process as testnet
   - Fund with more LINK (calculate based on expected volume)

4. **Monitor Closely:**
   - Set up alerts for low LINK balance
   - Monitor execution frequency
   - Track gas costs and optimize if needed

## 🎉 Success Checklist

- [ ] ✅ Contract deployed to Sepolia
- [ ] ✅ Automation upkeep registered
- [ ] ✅ Test game flow completed
- [ ] ✅ Players can enter and claim prizes
- [ ] ✅ Oracle can submit rankings
- [ ] ✅ Games auto-finalize via Chainlink
- [ ] ✅ Platform fees can be withdrawn
- [ ] ✅ Ready for mainnet deployment

## 🆘 Support

**Need Help?**
- **Chainlink Docs:** https://docs.chain.link/chainlink-automation
- **Chainlink Discord:** https://discord.gg/chainlink
- **Your Contract:** Check the automation dashboard for execution logs

**Common Issues:**
- **Upkeep not executing:** Check LINK balance and gas limits
- **Game stuck:** Use `manuallyFinalizeGame()` as fallback
- **Players can't enter:** Verify game is active and USDC approved

---

**🎮 Your automated trivia game is ready to go live!** 

The Chainlink Automation will handle game finalization automatically, so you can focus on building great games while the blockchain handles the rest! 🚀
