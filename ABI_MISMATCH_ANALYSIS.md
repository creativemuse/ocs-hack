# ABI Mismatch Analysis & Resolution Plan

## 🔍 Current Status

The frontend ABI in `lib/blockchain/contracts.ts` contains functions that don't exist in the deployed contract. However, these functions are **actively used** in the frontend code.

## ⚠️ Missing Functions in Contract

### 1. `joinTrialBattle(string sessionId)` 
**Status:** ❌ NOT in contract  
**Used in:** 
- `hooks/useTriviaContract.ts` (line 428)
- `components/game/BlockchainGameEntry.tsx` (line 69)
- `lib/transaction/baseAccountCalls.ts`

**Impact:** Trial players cannot join games without this function.

**Options:**
- **Option A:** Add function to contract (recommended if trial mode is needed)
- **Option B:** Remove trial mode from frontend (breaking change)

---

### 2. `claimWinnings()`
**Status:** ❌ NOT in contract  
**Used in:**
- `components/game/ClaimWinningsButton.tsx` (line 46)
- `hooks/useTriviaContract.ts` (line 553)
- `components/game/HighScoreDisplay.tsx` (indirectly)

**Impact:** Players cannot claim their winnings. Current contract auto-distributes prizes.

**Contract Design:** The current contract uses automatic prize distribution via `distributePrizes()`, which immediately sends prizes to winners. There's no claiming mechanism.

**Options:**
- **Option A:** Add claiming function to contract (change design to claim-based)
- **Option B:** Remove claiming UI, prizes auto-distribute (align with current contract)

---

### 3. `submitScore(uint256 score)` vs `submitScores(address[] calldata, uint256[] calldata)`
**Status:** ⚠️ MISMATCH  
**Contract has:** `submitScores(address[] calldata playerAddresses, uint256[] calldata scores)` - takes arrays, owner/chainlink only  
**Frontend expects:** `submitScore(uint256 score)` - single score, player can call

**Used in:**
- `hooks/useTriviaContract.ts`
- `components/game/HighScoreDisplay.tsx`
- Multiple components

**Impact:** Individual players cannot submit their own scores. Only owner/chainlink can submit scores in batches.

**Contract Design:** The contract is designed for owner/chainlink to submit all scores at once after the game session ends, not for individual players to submit during gameplay.

**Options:**
- **Option A:** Add `submitScore(uint256 score)` function to contract (allow individual submissions)
- **Option B:** Change frontend to not submit scores directly - use off-chain scoring and batch submit via owner/chainlink
- **Option C:** Keep current design - scores submitted off-chain, owner/chainlink submits via `submitScores()` after session

---

### 4. `hasClaimed(address)` 
**Status:** ❌ NOT in contract  
**Used in:** ABI definition only (not actively called in code)  
**Impact:** Low - mainly used for UI state tracking

**Options:**
- **Option A:** Add to contract if claim-based design is adopted
- **Option B:** Remove from ABI (use local storage like current code does)

---

## 🎯 Recommended Resolution Strategy

### Phase 1: Immediate (Deploy Current Contract)
**Keep contract as-is for now:**
- Contract already has `joinBattle()` ✅
- Use `submitScores()` for batch score submission via owner/chainlink
- Prizes auto-distribute via `distributePrizes()` ✅

**Frontend changes needed:**
- Comment out or remove calls to `joinTrialBattle()` (or implement off-chain trial mode)
- Remove `claimWinnings()` UI (prizes auto-distribute)
- Remove individual `submitScore()` calls - use off-chain tracking, then batch submit via owner/chainlink

### Phase 2: Future Enhancement (Optional)
If you want these features, add to contract:

```solidity
// Trial battle support
function joinTrialBattle(string memory sessionId) external nonReentrant {
    // Implementation for trial players
}

// Individual score submission
function submitScore(uint256 score) external nonReentrant {
    require(isSessionActive, "Session not active");
    require(hasParticipated[msg.sender], "Not in session");
    playerScores[msg.sender] = score;
    emit ScoreSubmitted(msg.sender, score, block.timestamp);
}

// Claim-based winnings (change from auto-distribute)
mapping(address => uint256) public pendingWinnings;
mapping(address => bool) public hasClaimed;

function claimWinnings() external nonReentrant {
    uint256 amount = pendingWinnings[msg.sender];
    require(amount > 0, "No winnings");
    require(!hasClaimed[msg.sender], "Already claimed");
    
    hasClaimed[msg.sender] = true;
    pendingWinnings[msg.sender] = 0;
    USDC_TOKEN.safeTransfer(msg.sender, amount);
    emit WinningsClaimed(msg.sender, amount);
}
```

## 📋 Quick Fix: Remove Missing Functions from ABI

To make the current contract work with minimal changes:

1. **Remove from ABI** (`lib/blockchain/contracts.ts`):
   - `joinTrialBattle`
   - `claimWinnings`
   - `submitScore` (keep only `submitScores`)
   - `hasClaimed`

2. **Update frontend hooks** to not call these functions

3. **Use current contract design:**
   - Players join via `joinBattle()`
   - Owner/chainlink submits scores via `submitScores()`
   - Prizes auto-distribute via `distributePrizes()`

## 🔧 Contract Functions That Exist

✅ **Functions that work:**
- `joinBattle()` - Join a session (fixed!)
- `startNewSession()` - Start new session
- `submitScores(address[], uint256[])` - Submit scores (owner/chainlink only)
- `distributePrizes()` - Auto-distribute prizes
- `endSession()` - End session
- All view functions (`getCurrentPlayers()`, `getPlayerScore()`, etc.)

## 📝 Next Steps

1. **Decide on design:**
   - Keep current contract design (auto-distribute, batch scores)?
   - OR add missing functions to contract (trial mode, individual scores, claiming)?

2. **If keeping current design:**
   - Update frontend to remove calls to missing functions
   - Remove missing functions from ABI
   - Use off-chain tracking for trial mode if needed

3. **If adding functions:**
   - Add functions to contract
   - Deploy updated contract
   - Update ABI to match

## 🚀 Deployment Readiness

**Current Status:** Contract is ready to deploy with `joinBattle()` fix ✅

**ABI Mismatch Impact:** Frontend will need updates to work with deployed contract unless missing functions are added.

**Recommendation:** Deploy current contract, then either:
- Update frontend to match contract design, OR
- Add missing functions to contract in next version
