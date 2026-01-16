# Frontend Update Plan to Match Contract Design

## Overview
The frontend currently expects functions that don't exist in the deployed contract. This document outlines the changes needed to align the frontend with the current contract design.

## Current Contract Functions (Available)

### ✅ Available Functions
- `joinBattle()` - Join a session (entry fee required)
- `startNewSession()` - Start new session (owner only)
- `submitScores(address[] calldata, uint256[] calldata)` - Submit scores in batch (owner/chainlink only)
- `distributePrizes()` - Auto-distribute prizes (owner/chainlink only)
- `endSession()` - End session (owner only)
- `getCurrentPlayers()` - Get all players
- `getPlayerScore(address)` - Get player score
- `getContractUsdcBalance()` - Get contract USDC balance
- `getPendingWithdrawal(address)` - Get pending withdrawal

### ❌ Functions NOT in Contract (Used by Frontend)
- `joinTrialBattle(string)` - Trial players cannot join on-chain
- `claimWinnings()` - Prizes auto-distribute, no claiming needed
- `submitScore(uint256)` - Only batch `submitScores()` exists
- `hasClaimed(address)` - Not needed (auto-distribution)
- `startSession(uint256)` - Should be `startNewSession()`

## Required Frontend Updates

### 1. Update ABI Comments
Mark missing functions in `lib/blockchain/contracts.ts` with comments indicating they're not in the contract.

### 2. Update Hooks

#### `hooks/useTriviaContract.ts`
- `joinTrialBattle()`: Return error or show "Trial mode not available"
- `claimWinnings()`: Return error or show "Prizes auto-distribute"
- `submitScore()`: Return error or use off-chain tracking

#### `hooks/useSponsoredTriviaContract.ts`
- Remove or disable `createJoinTrialBattleCall()`
- Remove or disable `createSubmitTrialScoreCall()`

### 3. Update Components

#### `components/game/BlockchainGameEntry.tsx`
- Disable "Start Trial" button with message: "Trial mode requires off-chain implementation"
- Keep "Join Battle" button active (uses `joinBattle()`)

#### `components/game/ClaimWinningsButton.tsx`
- Show: "Prizes automatically distribute after session ends"
- Remove claim button functionality

#### `components/game/HighScoreDisplay.tsx`
- Track scores off-chain
- Don't call `submitScore()` - scores should be collected off-chain and submitted via `submitScores()` by owner/chainlink

### 4. Design Changes

**Trial Mode:**
- Move to off-chain only (SpacetimeDB or other off-chain solution)
- Or remove trial mode UI entirely

**Score Submission:**
- Frontend tracks scores locally/off-chain during gameplay
- Owner/Chainlink submits all scores at once via `submitScores()` after session ends

**Prize Distribution:**
- Automatic via `distributePrizes()` called by owner/Chainlink CRE
- No claiming UI needed - prizes are sent directly to winners

## Implementation Priority

### Phase 1: Quick Fixes (Immediate)
1. ✅ Contract `joinBattle()` function name fixed
2. Comment out missing function calls in hooks
3. Add error messages when missing functions are called
4. Update UI to show appropriate messages

### Phase 2: Component Updates (Short-term)
1. Disable trial mode UI or implement off-chain
2. Remove claim winnings button
3. Update score submission to off-chain tracking

### Phase 3: Architecture (Long-term)
1. Implement off-chain trial mode (SpacetimeDB)
2. Implement batch score submission system
3. Update UI to reflect auto-distribution design

## Notes

- The contract design is optimized for owner/Chainlink automation
- Individual player operations are intentionally limited
- Score submission happens off-chain, then batch-submitted by owner
- Prizes automatically distribute - no claiming needed
