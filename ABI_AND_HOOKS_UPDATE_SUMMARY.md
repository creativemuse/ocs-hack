# ABI and Hooks Update Summary

## Overview
Updated the contract ABI and frontend hooks to match the newly deployed TriviaBattle contract on Base Sepolia.

## Changes Made

### 1. Contract ABI Update (`lib/blockchain/contracts.ts`)

**Updated:**
- ✅ Replaced entire ABI with the compiled ABI from `out/TriviaBattle.sol/TriviaBattle.json`
- ✅ Updated contract address to use environment variable with Base Sepolia default
- ✅ Updated USDC address to support both Base Sepolia and Mainnet via environment variable

**Contract Address:**
- Base Sepolia: `0xe72Fc03137A1412354ca97282071d173Ae592D96` (default)
- Base Mainnet: `0xc166a6FB38636e8430d6A2Efb7A601c226659425` (old deployment)

**USDC Address:**
- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (default)
- Base Mainnet: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`

### 2. Hook Updates (`hooks/useTriviaContract.ts`)

**Updated Functions:**

1. **`startSession()` → `startNewSession()`**
   - **Before:** `startSession(duration: number)` - took duration parameter
   - **After:** `startNewSession()` - no parameters, uses configured `sessionInterval`
   - **Note:** Only contract owner can call this

2. **`fetchSessionInfo()`**
   - **Before:** Called `getSessionInfo()` which doesn't exist in new contract
   - **After:** Builds session info from multiple contract calls:
     - `isSessionActive()` - boolean
     - `sessionCounter()` - uint256
     - `lastSessionTime()` - uint256
     - `sessionInterval()` - uint256
     - `currentSessionPrizePool()` - uint256
     - `getCurrentPlayers()` - address[]

3. **`checkSessionStatus()`**
   - **Before:** Called `getSessionInfo()` and parsed complex return value
   - **After:** Calls `isSessionActive()` directly (simpler boolean return)

4. **`submitScore()`**
   - **Status:** Removed implementation (function doesn't exist for players)
   - **Note:** Contract has `submitScores(address[], uint256[])` for batch submission by owner/chainlink only
   - **Action:** Returns error message explaining scores must be tracked off-chain

5. **`submitTrialScore()`**
   - **Status:** Removed implementation (function doesn't exist)
   - **Note:** Trial mode must be implemented off-chain (e.g., via SpacetimeDB)

6. **`claimWinnings()`**
   - **Status:** Removed implementation (function doesn't exist)
   - **Note:** Prizes automatically distribute via `distributePrizes()` called by owner/chainlink
   - **Action:** Returns error message explaining no claiming needed

### 3. Sponsored Contract Hook Updates (`hooks/useSponsoredTriviaContract.ts`)

**Updated Functions:**

1. **`createJoinTrialBattleCall()`**
   - **Status:** Returns `null` with warning
   - **Note:** Trial battle not available in contract

2. **`createSubmitScoreCall()`**
   - **Status:** Returns `null` with warning
   - **Note:** Individual score submission not available for players

3. **`createSubmitTrialScoreCall()`**
   - **Status:** Returns `null` with warning
   - **Note:** Trial score submission not available in contract

**Unchanged Functions:**
- ✅ `createApproveUSDCCall()` - Still works (USDC approval)
- ✅ `createJoinBattleCall()` - Still works (join battle)

## Contract Interface Changes Summary

### Functions Available to Players:
- ✅ `joinBattle()` - Join a battle (pays entry fee)
- ✅ `getCurrentPlayers()` - View current players
- ✅ `getPlayerScore(address)` - View player score
- ✅ `isSessionActive()` - Check if session is active
- ✅ View functions: `sessionCounter`, `lastSessionTime`, `sessionInterval`, `currentSessionPrizePool`, etc.

### Functions Available to Owner/Chainlink Only:
- ✅ `startNewSession()` - Start new session (no params)
- ✅ `endSession()` - End session and distribute prizes
- ✅ `distributePrizes()` - Distribute prizes (can be automated via Chainlink)
- ✅ `submitScores(address[], uint256[])` - Submit scores for multiple players in batch
- ✅ `setChainlinkOracle(address)` - Set Chainlink oracle
- ✅ `setChainlinkFunctions(address)` - Set Chainlink Functions
- ✅ `initiateEmergencyWithdraw()` - Initiate emergency withdrawal
- ✅ `executeWithdrawal()` - Execute pending withdrawal

### Functions Removed:
- ❌ `startSession(duration)` - Replaced with `startNewSession()`
- ❌ `submitScore(score)` - Replaced with batch `submitScores()` (owner only)
- ❌ `claimWinnings()` - Prizes auto-distribute, no claiming needed
- ❌ `joinTrialBattle(sessionId)` - Trial mode not in contract
- ❌ `submitTrialScore(sessionId, score)` - Trial mode not in contract
- ❌ `getSessionInfo()` - Replaced with multiple individual calls
- ❌ `getTrialPlayerScore(sessionId)` - Trial mode not in contract

## Testing Checklist

- [ ] Verify contract address is correctly set in environment
- [ ] Test `joinBattle()` function
- [ ] Test `startNewSession()` as contract owner
- [ ] Test `checkSessionStatus()` returns correct boolean
- [ ] Verify `fetchSessionInfo()` builds correct session info
- [ ] Test USDC approval flow
- [ ] Verify error messages for removed functions are clear
- [ ] Test on Base Sepolia testnet
- [ ] Update environment variables for production when ready

## Environment Variables

Add to your `.env` file:

```bash
# Contract addresses (optional - defaults to Base Sepolia)
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=0xe72Fc03137A1412354ca97282071d173Ae592D96
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

For Base Mainnet (when deployed):
```bash
NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS=<mainnet_address>
NEXT_PUBLIC_USDC_ADDRESS=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
```

## Next Steps

1. **Test the updated hooks** on Base Sepolia
2. **Update frontend components** that use these hooks if needed
3. **Implement off-chain score tracking** for gameplay (scores submitted in batch after session)
4. **Set up Chainlink Functions** for automated prize distribution
5. **Deploy to Base Mainnet** when ready

## Files Modified

1. `lib/blockchain/contracts.ts` - Updated ABI and addresses
2. `hooks/useTriviaContract.ts` - Updated to match new contract interface
3. `hooks/useSponsoredTriviaContract.ts` - Updated to handle removed functions

## Notes

- All changes are backward compatible with the environment variable approach
- Default addresses point to Base Sepolia for testing
- Removed functions return clear error messages explaining the change
- Score submission must be handled off-chain during gameplay, then submitted in batch by owner/chainlink
- Trial mode functionality must be implemented entirely off-chain (e.g., via SpacetimeDB)
