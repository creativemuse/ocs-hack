# Claim-Based Prize Distribution System Setup

## Overview

The TriviaBattle contract has been updated to use a **claim-based prize distribution system**, allowing players to claim their winnings with a gasless button instead of automatic transfers.

## What Changed

### Smart Contract Updates
- ✅ Added `playerWinnings` mapping to track claimable prizes
- ✅ Added `hasClaimed` mapping to prevent double claims
- ✅ Added `claimWinnings()` function for players to claim prizes
- ✅ Added `WinningsClaimed` event for tracking claims
- ✅ Modified `distributePrizes()` to SET winnings instead of TRANSFER

### New Contract Deployment
- **Contract Address**: `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`
- **Network**: Base Mainnet (Chain ID: 8453)
- **Deployed**: October 13, 2025
- **Features**: Claim-based prize distribution with gasless support

## Benefits

✅ **Gasless Claims**: Players can claim without paying gas fees  
✅ **Better UX**: Players control when they receive winnings  
✅ **Reduced Admin Load**: Admin sets winnings in one transaction, players claim individually  
✅ **More Scalable**: Admin doesn't pay gas for multiple winner transfers  
✅ **Already Integrated**: Frontend claim button already works!

## Required Manual Steps

### 1. Update Paymaster Allowlist on CDP Dashboard

**IMPORTANT:** You must add the new contract and function to your paymaster allowlist for gasless claims to work.

1. **Go to CDP Dashboard:**
   - https://portal.cdp.coinbase.com/products/bundler-and-paymaster

2. **Navigate to your project:**
   - Project ID: `5b09d242-5390-4db3-866f-bfc2ce575821`

3. **Update Contract Allowlist:**

   **Contract 1: USDC Token (Existing - UPDATE)**
   - Address: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`
   - Network: Base Mainnet (Chain ID: 8453)
   - Functions: `approve`

   **Contract 2: TriviaBattle Game Contract (NEW - ADD THIS)**
   - Address: `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13` ← **NEW ADDRESS**
   - Network: Base Mainnet (Chain ID: 8453)
   - Functions: `joinBattle`, `joinTrialBattle`, `submitScore`, `submitTrialScore`, `claimWinnings` ← **ADD claimWinnings**

   **Note:** You can remove the old contract address `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a` from the allowlist

4. **Set Spending Limits (recommended):**
   - Daily limit: $100
   - Per-transaction limit: $5

5. **Save changes and wait 2-3 minutes** for propagation

## How Prize Distribution Works Now

### Admin Flow (After Game Session Ends)

```typescript
// 1. Admin calls distributePrizes() - sets playerWinnings for each winner
await PayoutSystem.distributePrizes(gameId, results);

// 2. Winners see their claimable amount in the UI
// 3. Prize distribution is synced to SpaceTimeDB
// 4. Top earners leaderboard updates automatically
```

### Player Flow (Claiming Winnings)

```typescript
// 1. Player completes game and sees their prize
// 2. "Claim Winnings" button appears (already in HighScoreDisplay.tsx)
// 3. Player clicks button
// 4. claimWinnings() is called with gasless transaction
// 5. USDC transferred from contract to player wallet
// 6. Button shows "Winnings Claimed ✓"
```

## Frontend Integration (Already Complete!)

The frontend already has all the necessary components:

### HighScoreDisplay Component
- ✅ Shows claim button for paid players with winnings
- ✅ Displays winnings amount
- ✅ Shows claimed status
- ✅ Handles gasless claim transactions

### useTriviaContract Hook  
- ✅ Updated to call real `claimWinnings()` function
- ✅ Properly handles transaction states
- ✅ Error handling included

## Testing the Claim Flow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Claim Button
1. Visit `http://localhost:3000`
2. Complete a paid game (connect wallet, pay entry fee)
3. Admin runs prize distribution
4. Player sees "Claim Winnings" button
5. Click to claim (gasless transaction!)
6. Verify USDC received in wallet

### 3. Verify on Basescan
Check the transaction at:
https://basescan.org/address/0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13

## Smart Contract Functions

### For Players (Gasless via Paymaster)
- `joinBattle()` - Pay entry fee and join game
- `joinTrialBattle(sessionId)` - Join as trial player
- `submitScore(score)` - Submit game score
- `submitTrialScore(sessionId, score)` - Submit trial score
- `claimWinnings()` - **NEW!** Claim accumulated prizes

### For Admin (Owner Only)
- `startSession(duration)` - Start new game session
- `distributePrizes()` - Calculate and set prize winnings
- `emergencyWithdraw()` - Withdraw USDC if needed
- `updatePlatformFeeRecipient(address)` - Update fee recipient

### View Functions (Free)
- `playerWinnings(address)` - **NEW!** Check claimable amount
- `hasClaimed(address)` - **NEW!** Check if already claimed
- `getSessionInfo()` - Get current session details
- `getPlayerScore(address)` - Get player's score

## Integration with Leaderboard

The prize distribution automatically syncs to SpaceTimeDB via `PayoutSystem.distributePrizes()`:

1. **Prizes Distributed** → Contract sets `playerWinnings`
2. **Sync to SpaceTimeDB** → `record_prize_distribution` updates `total_earnings`
3. **Leaderboard Updates** → Top earners show real cumulative USDC winnings
4. **Auto-refresh** → Home page polls every 30 seconds

## Monitoring

### Check Player Winnings
```bash
# Using cast (Foundry)
cast call 0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13 \
  "playerWinnings(address)(uint256)" \
  <player-address> \
  --rpc-url https://mainnet.base.org

# Example output: 500000 (0.5 USDC in wei)
```

### Check Claim Status
```bash
cast call 0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13 \
  "hasClaimed(address)(bool)" \
  <player-address> \
  --rpc-url https://mainnet.base.org

# Example output: false (not claimed yet)
```

## Troubleshooting

### "No winnings to claim" Error
- Admin hasn't run `distributePrizes()` yet
- Player wasn't in top 10 winners
- Check `playerWinnings` mapping for player address

### "Already claimed" Error
- Player has already claimed their winnings
- Check `hasClaimed` mapping

### Gasless Transaction Fails
- Verify contract is in paymaster allowlist
- Verify `claimWinnings` function is allowlisted
- Check paymaster has sufficient funds
- Wait 2-3 minutes after updating allowlist

### Claim Button Doesn't Appear
- Player must be a paid player (not trial)
- Player must have winnings > 0
- Check `usePlayerWinnings` hook calculation

## Next Steps

1. ✅ Update paymaster allowlist (manual step in CDP Dashboard)
2. ✅ Test claim flow with a real game
3. ✅ Monitor gas sponsorship usage
4. ✅ Verify leaderboard updates correctly

## Quick Reference

- **Old Contract** (DO NOT USE): `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`
- **New Contract** (ACTIVE): `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`
- **Paymaster Dashboard**: https://portal.cdp.coinbase.com/products/bundler-and-paymaster
- **Basescan**: https://basescan.org/address/0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13

