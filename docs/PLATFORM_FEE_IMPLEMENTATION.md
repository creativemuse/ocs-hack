# Platform Fee Implementation

## Overview
Added a 3% platform fee to the TriviaBattlev2.sol smart contract. This fee is deducted from each entry fee before adding to the prize pool.

## Changes Made

### 1. Constants & State Variables
- **Added `PLATFORM_FEE_PERCENTAGE`**: 300 basis points (3%)
- **Updated `TOP_PRIZE_PERCENTAGE`**: 9215 basis points (95% of 97%)
- **Updated `REMAINING_PERCENTAGE`**: 485 basis points (5% of 97%)
- **Added `platformFeeRecipient`**: Address to receive platform fees
- **Added `accumulatedPlatformFees`**: Tracks total fees collected

### 2. Game Struct
- **Added `platformFee`**: Tracks platform fees per game

### 3. Constructor
- **Updated constructor**: Now requires `_platformFeeRecipient` parameter
```solidity
constructor(address _usdc, address _gameOracle, address _platformFeeRecipient)
```

### 4. Entry Fee Distribution
When a player enters with 1 USDC:
- **Platform Fee**: 0.03 USDC (3%)
- **Prize Pool**: 0.97 USDC (97%)

### 5. New Functions

#### `withdrawPlatformFees()`
- Owner-only function
- Withdraws accumulated platform fees to `platformFeeRecipient`
- Protected by `nonReentrant` modifier
- Emits `PlatformFeesWithdrawn` event

#### `updatePlatformFeeRecipient(address newRecipient)`
- Owner-only function
- Updates the platform fee recipient address
- Validates non-zero address
- Emits `PlatformFeeRecipientUpdated` event

### 6. Updated Events
- **`GameFinalized`**: Now includes `platformFee` parameter
- **Added `PlatformFeeRecipientUpdated`**: Emitted when recipient changes
- **Added `PlatformFeesWithdrawn`**: Emitted when fees are withdrawn

### 7. Updated View Functions
- **`getGameInfo()`**: Now returns `platformFee` for each game

## Prize Distribution Example

For a game with 10 players (10 USDC total entry fees):

### Fee Split
- **Platform Fee**: 0.30 USDC (3%)
- **Prize Pool**: 9.70 USDC (97%)

### Prize Distribution (from 9.70 USDC)
- **1st Place**: 4.6075 USDC (47.5% of total)
- **2nd Place**: 2.7645 USDC (28.5% of total)
- **3rd Place**: 1.843 USDC (19% of total)
- **4th-10th Place**: ~0.0693 USDC each (5% split among 7 players)

## Security Considerations

1. **ReentrancyGuard**: `withdrawPlatformFees()` protected against reentrancy
2. **Access Control**: Only owner can withdraw fees or update recipient
3. **Zero Address Check**: Validates recipient address in constructor and update function
4. **Atomic Operations**: Fee calculation and distribution happen atomically in `enterGame()`

## Deployment Notes

When deploying the contract, you must provide:
1. USDC token address
2. Game oracle address
3. **Platform fee recipient address** (NEW)

Example:
```javascript
const contract = await TriviaGame.deploy(
  usdcAddress,
  oracleAddress,
  platformFeeRecipientAddress
);
```

## Testing Checklist

- [ ] Test entry fee split (97% to prize pool, 3% to platform)
- [ ] Test `withdrawPlatformFees()` function
- [ ] Test `updatePlatformFeeRecipient()` function
- [ ] Verify prize calculations with platform fee
- [ ] Test multiple games accumulating fees
- [ ] Verify events are emitted correctly
- [ ] Test access control (only owner can withdraw/update)
- [ ] Test reentrancy protection on withdrawal

## Migration from v1

If upgrading from TriviaBattle.sol (v1):
1. Deploy new contract with platform fee recipient
2. Migrate any active games (if applicable)
3. Update frontend to handle new `getGameInfo()` return values
4. Update backend oracle to work with new contract address
5. Test thoroughly on testnet before mainnet deployment

