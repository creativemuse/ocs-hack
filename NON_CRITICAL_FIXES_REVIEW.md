# Non-Critical Issues Review & Fix Plan

## 🔍 Analysis of Non-Critical Issues

### Issue 1: ABI Contains Non-Existent Functions
**Current Status:** The ABI in `lib/blockchain/contracts.ts` includes functions from `TriviaBattlev4` that don't exist in `TriviaBattle`.

**Functions in ABI but NOT in Contract:**
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

**Impact:** Low - Frontend code already uses correct functions, but having wrong ABI can cause confusion and TypeScript errors.

**Recommendation:** Replace ABI with correct contract ABI to ensure type safety.

---

### Issue 2: Trial Mode Functions Don't Exist
**Current Status:** 
- ❌ `joinTrialBattle(string sessionId)` - Doesn't exist in contract
- Hooks already have warnings, but components still try to use it

**Where Used:**
- `components/game/BlockchainGameEntry.tsx` - Calls `joinTrialBattle()` (line 69)
- `hooks/useTriviaContract.ts` - Has function but it doesn't work (line 271)
- `hooks/useSponsoredTriviaContract.ts` - Already has warning and returns null (line 59)
- `lib/transaction/paidGameCalls.ts` - `createTrialGameCalls()` references it (line 37)

**Impact:** Medium - Trial mode UI exists but won't work. Could confuse users.

**Recommendation:** 
- Disable trial mode UI with clear messaging
- Or implement trial mode off-chain via SpacetimeDB

---

### Issue 3: Individual Score Submission Doesn't Exist
**Current Status:**
- ❌ `submitScore(uint256 score)` - Doesn't exist for players
- ✅ `submitScores(address[] calldata, uint256[] calldata)` - Exists but owner/chainlink only

**Where Used:**
- `components/game/BlockchainGameEntry.tsx` - Uses `submitScore()` (line 35)
- `hooks/useTriviaContract.ts` - Has function but it calls wrong function (line 310)
- `hooks/useSponsoredTriviaContract.ts` - Already has warning (line 66)

**Impact:** Medium - Score submission UI exists but won't work for players. Only owner/chainlink can submit scores in batch.

**Recommendation:**
- Remove individual score submission UI
- Show message that scores are submitted by owner/chainlink after session ends
- Or implement off-chain score tracking

---

## 🔧 Proposed Fixes

### Fix 1: Update ABI to Match Contract
**Action:** Replace `TRIVIA_ABI_INLINE` in `lib/blockchain/contracts.ts` with the correct ABI from the deployed contract.

**Steps:**
1. Use the ABI from `lib/blockchain/triviabattle-mainnet-abi.json`
2. Replace the inline ABI in `contracts.ts`
3. Ensure all function names match the contract

**Risk:** Low - Will improve type safety and prevent confusion.

---

### Fix 2: Disable Trial Mode UI
**Action:** Update components to show that trial mode is not available on-chain.

**Files to Update:**
1. `components/game/BlockchainGameEntry.tsx`
   - Disable "Join Trial Battle" button
   - Add message: "Trial mode is not available on-chain. Implement via SpacetimeDB for off-chain trial mode."

2. `lib/transaction/paidGameCalls.ts`
   - Comment out or remove `createTrialGameCalls()` function
   - Add comment explaining why it's disabled

**Risk:** Low - Will prevent user confusion.

---

### Fix 3: Update Score Submission UI
**Action:** Update components to show that individual score submission is not available.

**Files to Update:**
1. `components/game/BlockchainGameEntry.tsx`
   - Remove or disable score submission UI
   - Add message explaining batch submission

2. `hooks/useTriviaContract.ts`
   - Update `submitScore()` to throw clear error or return early
   - Add documentation explaining batch submission

**Risk:** Low - Will prevent failed transactions.

---

## ✅ Benefits of Fixing These Issues

1. **Better Type Safety** - Correct ABI ensures TypeScript catches errors at compile time
2. **User Experience** - Clear messaging prevents confusion when features don't work
3. **Code Clarity** - Removing dead code makes the codebase easier to maintain
4. **Prevent Errors** - Users won't try to call non-existent functions

---

## ⚠️ What Will Break If We Don't Fix

1. **ABI Mismatch** - TypeScript types won't match actual contract (may cause runtime errors)
2. **Trial Mode** - Users will see trial mode UI but it won't work
3. **Score Submission** - Users will see score submission UI but it won't work for them

---

## 📋 Implementation Priority

1. **High Priority:** Update ABI (prevents type errors)
2. **Medium Priority:** Disable trial mode UI (prevents user confusion)
3. **Medium Priority:** Update score submission UI (prevents failed transactions)

---

## 🎯 Recommendation

Fix all three issues before mainnet deployment for a cleaner, more maintainable codebase. However, they're non-critical because the main user flow (`joinBattle()`) already works correctly.
