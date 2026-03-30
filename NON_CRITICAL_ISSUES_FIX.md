# Non-Critical Issues Fix Plan & Implementation

## 📋 Review Summary

### Issue 1: ABI Contains Non-Existent Functions
**Status:** ⚠️ **Medium Priority**  
**Impact:** Type safety, code clarity, potential TypeScript errors

**Functions in current ABI but NOT in contract:**
- ❌ `enterGame()` → Should be removed (contract has `joinBattle()`)
- ❌ `createGame()` → Should be removed (contract has `startNewSession()`)
- ❌ `currentGameId` → Should be removed (contract has `sessionCounter`)
- ❌ `games` mapping → Doesn't exist
- ❌ `getGameInfo(gameId)` → Doesn't exist
- ❌ `claimPrize(gameId)` → Doesn't exist (prizes auto-distribute)
- ❌ `hasPlayerClaimed(gameId, player)` → Doesn't exist
- ❌ `hasPlayerEntered(gameId, player)` → Use `hasParticipated(address)` instead
- ❌ `calculatePrize(gameId, ranking)` → Doesn't exist
- ❌ `getPlayerRanking(gameId, player)` → Doesn't exist

**Solution:**
- Replace ABI in `lib/blockchain/contracts.ts` with the correct ABI from the deployed contract
- Use the ABI from `lib/blockchain/triviabattle-mainnet-abi.json`

---

### Issue 2: Trial Mode Functions Don't Exist
**Status:** ⚠️ **Medium Priority**  
**Impact:** User confusion, failed transactions

**Problem:**
- ❌ `joinTrialBattle(string sessionId)` - Doesn't exist in contract
- ❌ `submitTrialScore(string sessionId, uint256 score)` - Doesn't exist

**Where Used:**
1. `hooks/useTriviaContract.ts`:
   - `joinTrialBattle()` - Has warning but still tries to call `joinBattle()` (line 271-304)
   - `submitTrialScore()` - Has warning but still tries to call `joinBattle()` (line 338-361)

2. `components/game/BlockchainGameEntry.tsx`:
   - Calls `joinTrialBattle()` (line 69)
   - Uses `submitTrialScore()` (line 36)

3. `lib/transaction/paidGameCalls.ts`:
   - `createTrialGameCalls()` references `joinTrialBattle` (line 37)

**Solution:**
- Update `joinTrialBattle()` to throw clear error or return early with message
- Update `submitTrialScore()` to throw clear error or return early
- Update `createTrialGameCalls()` to return null with warning
- Update UI components to disable trial mode buttons with clear messaging

---

### Issue 3: Individual Score Submission Doesn't Exist
**Status:** ⚠️ **Medium Priority**  
**Impact:** Failed transactions, user confusion

**Problem:**
- ❌ `submitScore(uint256 score)` - Doesn't exist for players
- ✅ `submitScores(address[] calldata, uint256[] calldata)` - Exists but owner/chainlink only

**Where Used:**
1. `hooks/useTriviaContract.ts`:
   - `submitScore()` - Has warning but tries to call `joinBattle()` (line 310-333)
   - Should throw error or return early

2. `components/game/BlockchainGameEntry.tsx`:
   - Uses `submitScore()` (line 35)

**Solution:**
- Update `submitScore()` to throw clear error explaining batch submission
- Update UI to show message that scores are submitted by owner/chainlink after session

---

## ✅ Recommended Actions

### Priority 1: Fix ABI (Recommended)
**Time:** ~30 minutes  
**Impact:** Improves type safety, prevents confusion

**Action:**
1. Import or inline the correct ABI from `triviabattle-mainnet-abi.json`
2. Replace `TRIVIA_ABI_INLINE` in `contracts.ts`
3. Remove all non-existent functions

---

### Priority 2: Disable Trial Mode (Recommended)
**Time:** ~20 minutes  
**Impact:** Prevents user confusion, failed transactions

**Actions:**
1. Update `joinTrialBattle()` to return early with error message
2. Update `submitTrialScore()` to return early with error message
3. Update `createTrialGameCalls()` to return null with console warning
4. Update `BlockchainGameEntry.tsx` to disable trial mode UI with message

---

### Priority 3: Fix Score Submission (Recommended)
**Time:** ~15 minutes  
**Impact:** Prevents failed transactions, clarifies workflow

**Actions:**
1. Update `submitScore()` to throw error explaining batch submission
2. Update UI to show message about batch submission workflow

---

## 🎯 Implementation Strategy

### Option A: Quick Fix (Recommended for Mainnet)
- Keep current ABI (it works, just has extra functions)
- Fix trial mode and score submission to throw clear errors
- Disable trial mode UI
- **Time:** ~30 minutes

### Option B: Complete Cleanup
- Replace ABI with correct one
- Fix all three issues comprehensively
- **Time:** ~1-2 hours

---

## 📝 Current Behavior

**Trial Mode:**
- Currently calls `joinBattle()` instead of non-existent `joinTrialBattle()`
- This means trial players actually join as paid players (confusing!)
- Should be disabled to prevent confusion

**Score Submission:**
- Currently calls `joinBattle()` instead of non-existent `submitScore()`
- This means submitting a score actually joins the battle again (wrong!)
- Should throw error explaining batch submission

---

## ✅ Recommended: Quick Fix Before Mainnet

1. **Trial Mode** - Update functions to throw errors
2. **Score Submission** - Update function to throw error
3. **UI Updates** - Disable buttons with clear messaging
4. **ABI Cleanup** - Can be done post-mainnet (low priority)
