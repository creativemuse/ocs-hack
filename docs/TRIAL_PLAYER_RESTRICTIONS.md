# Trial Player Restrictions Implementation

## Overview

This document outlines the comprehensive implementation of trial player restrictions across all systems to prevent abuse of the trial system for free prize pool access.

## 🎯 **Core Policy**

**Trial players can participate in games but are EXCLUDED from prize pool distributions.**

This prevents users from creating multiple trial accounts to win prizes without paying entry fees.

## 🔧 **Systems Updated**

### 1. **Smart Contract (TriviaBattle.sol)**

#### Key Changes:
- **Removed trial players from prize distribution logic**
- **Updated contract documentation** to reflect new policy
- **Simplified prize distribution** to only include paid players
- **Removed trial winner tracking** and manual payout system

#### Before:
```solidity
// Equal opportunity: trial and paid players compete for the same prizes
function distributePrizes() {
    // Collect all scores (paid and trial players)
    // Trial players could win prizes from prize pool
}
```

#### After:
```solidity
// RESTRICTED: Only paid players are eligible for prize pool distributions
function distributePrizes() {
    // Collect only paid player scores (trial players excluded)
    // Only paid players can win prizes from prize pool
}
```

### 2. **SpacetimeDB Module (lib.rs)**

#### Key Changes:
- **Added `player_type` field** to all relevant structures
- **Separated paid vs trial player tracking**
- **Updated leaderboard logic** to filter by player type
- **Added trial-specific leaderboard** for display purposes
- **Modified session tracking** to distinguish player types

#### New Structures:
```rust
pub struct GameSession {
    pub player_type: String, // "paid" or "trial"
    // ... other fields
}

pub struct ActiveGameSession {
    pub paid_player_count: u32,    // Only these contribute to prize pool
    pub trial_player_count: u32,   // For tracking only
    pub prize_pool: f64,           // Only from paid player entry fees
    // ... other fields
}
```

#### New Functions:
- `get_trial_leaderboard()` - Trial players only (no prizes)
- `update_player_type()` - Convert trial to paid
- Enhanced `join_active_game_session()` with player type parameter

### 3. **Frontend Components**

#### Key Changes:
- **Updated scoring system** to check player eligibility
- **Enhanced UI messaging** about trial limitations
- **Modified leaderboard display** to show player types
- **Updated game session tracking** with player type

#### Files Modified:
- `lib/game/scoring.ts` - Added `isEligibleForPrizePool()` method
- `components/game/TrialStatusDisplay.tsx` - Added warning about prize exclusion
- `components/leaderboard/LiveRankings.tsx` - Show player type badges
- `app/page.tsx` - Updated game completion messaging
- `app/api/high-scores/route.ts` - Added player type tracking

## 📊 **Data Flow**

### Player Journey:
1. **New Player** → Defaults to `trial` type
2. **Trial Game** → Can play, score tracked, but no prize eligibility
3. **Payment** → Player type updated to `paid`
4. **Paid Game** → Full prize pool eligibility

### Prize Pool Calculation:
```
Prize Pool = Sum of all paid player entry fees
Trial players contribute $0 to prize pool
Only paid players can win from prize pool
```

## 🛡️ **Security Measures**

### 1. **Smart Contract Level**
- Prize distribution logic only processes paid players
- No trial player addresses in winner arrays
- Contract-level enforcement of policy

### 2. **Database Level**
- Player type tracked in all game sessions
- Separate leaderboards for paid vs trial players
- Prize pool only accumulates from paid entries

### 3. **Frontend Level**
- Clear messaging about trial limitations
- Visual indicators for player types
- Scoring system validates eligibility

## 🎮 **User Experience**

### Trial Players See:
- ⚠️ "Trial players cannot win prizes from the prize pool"
- 🏆 Trial leaderboard (for fun, no prizes)
- 💰 Clear upgrade path to paid status

### Paid Players See:
- ✅ Full prize pool eligibility
- 🏆 Main leaderboard with prize distribution
- 💎 Premium player status indicators

## 🔄 **Migration Notes**

### For Existing Data:
- Existing players default to `trial` type
- Historical scores remain but marked as trial
- No retroactive prize pool changes

### For New Deployments:
- All systems start with trial restrictions
- Clear upgrade path from trial to paid
- Consistent messaging across all interfaces

## 📋 **Testing Checklist**

### Smart Contract:
- [ ] Trial players cannot win prizes
- [ ] Only paid players in prize distribution
- [ ] Prize pool only from paid entry fees
- [ ] Contract events reflect new policy

### SpacetimeDB:
- [ ] Player type tracking works correctly
- [ ] Separate leaderboards function
- [ ] Session tracking distinguishes player types
- [ ] Player type updates work

### Frontend:
- [ ] Trial warnings display correctly
- [ ] Leaderboard shows player types
- [ ] Scoring system validates eligibility
- [ ] UI messaging is clear and consistent

## 🚀 **Deployment**

### Smart Contract:
```bash
# Deploy updated contract
npx hardhat run scripts/deploy-contract.cjs --network base-sepolia
```

### SpacetimeDB:
```bash
# Build and deploy updated module
cd spacetime-module/beat-me
cargo build --release
# Deploy to SpacetimeDB instance
```

### Frontend:
```bash
# Deploy updated frontend
npm run build
npm run deploy
```

## 📈 **Monitoring**

### Key Metrics:
- Trial to paid conversion rate
- Prize pool distribution accuracy
- Player type tracking consistency
- User feedback on trial limitations

### Alerts:
- Trial players winning prizes (should be 0)
- Prize pool calculation errors
- Player type tracking failures

## 🔮 **Future Enhancements**

### Potential Improvements:
- Trial player achievement system (no prizes)
- Graduated trial limits (time-based)
- Social features for trial players
- Enhanced upgrade incentives

### Considerations:
- Balance trial experience vs paid conversion
- Maintain game fairness and integrity
- Clear value proposition for paid upgrade
- Scalable player type management

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Status:** Implemented and Deployed
