# SpacetimeDB Testing Guide

Complete guide for testing the wallet identity system end-to-end.

---

## Prerequisites

Before running tests, ensure:

1. **SpacetimeDB module deployed**:
   ```bash
   spacetime list -s maincloud
   # Should show: beat-me with recent timestamp
   ```

2. **Environment variables set** in `.env.local`:
   ```bash
   NEXT_PUBLIC_SPACETIME_HOST=https://maincloud.spacetimedb.com
   NEXT_PUBLIC_SPACETIME_MODULE=beat-me
   
   SPACETIME_HOST=https://maincloud.spacetimedb.com
   SPACETIME_MODULE=beat-me
   ```

3. **Dependencies installed**:
   ```bash
   npm install
   ```

---

## Automated Test Scripts

We've created 4 test scripts to verify all functionality:

### 1. Wallet Identity Flow Test

**Tests**: Paid player with wallet-based identity

```bash
npx ts-node scripts/test-wallet-identity-flow.ts
```

**What it tests**:
- ✅ Wallet linking to SpacetimeDB identity
- ✅ Player profile creation
- ✅ Game session with wallet address
- ✅ Question attempts recorded
- ✅ Stats updated under wallet address
- ✅ Leaderboard query works

**Expected output**:
```
✅ ALL TESTS PASSED!
📊 Summary:
   ✅ Wallet linked to identity
   ✅ Game session created with wallet address
   ✅ Question attempts recorded
   ✅ Player stats updated under wallet address
   ✅ Leaderboard query works
```

### 2. Trial Player Flow Test

**Tests**: Trial/guest player with guest ID

```bash
npx ts-node scripts/test-trial-player-flow.ts
```

**What it tests**:
- ✅ Guest player creation
- ✅ Trial session with guest ID (no wallet)
- ✅ Guest game recording
- ✅ Guest stats updates
- ✅ Trial leaderboard separate from paid
- ✅ Trial player excluded from paid leaderboard

**Expected output**:
```
✅ ALL TRIAL PLAYER TESTS PASSED!
📊 Summary:
   ✅ Guest player created
   ✅ Trial session started with guest ID
   ✅ Guest game recorded
   ✅ Guest stats updated
   ✅ Trial leaderboard works
   ✅ Excluded from paid leaderboard
```

### 3. Leaderboard Earnings Test

**Tests**: Leaderboard ranking by cumulative USDC

```bash
npx ts-node scripts/test-leaderboard-earnings.ts
```

**What it tests**:
- ✅ Creates multiple players with different earnings
- ✅ Leaderboard sorted by total_earnings DESC
- ✅ Trial players in separate leaderboard
- ✅ No overlap between paid and trial

**Expected output**:
```
🏆 Leaderboard (Ranked by Cumulative USDC Earnings):
1. Diana: $200.00 USDC
2. Bob: $125.75 USDC
3. Eve: $75.25 USDC
4. Alice: $50.50 USDC
5. Charlie: $25.00 USDC

✅ ALL LEADERBOARD TESTS PASSED!
```

### 4. Cross-Device Persistence Test

**Tests**: Stats persist when same wallet connects from different devices

```bash
npx ts-node scripts/test-cross-device-persistence.ts
```

**What it tests**:
- ✅ Play game on "Device 1"
- ✅ Stats saved under wallet
- ✅ Disconnect and reconnect (simulates Device 2)
- ✅ Stats load from wallet (persisted)
- ✅ Play game on "Device 2"
- ✅ Stats accumulated from both devices

**Expected output**:
```
📱 DEVICE 1: Stats after first game: 1 game, score 10
📱 DEVICE 2: Stats loaded: 1 game, score 10 (PERSISTED!)
📱 DEVICE 2: After second game: 2 games, score 20

✅✅✅ CROSS-DEVICE PERSISTENCE VERIFIED! ✅✅✅
```

### 5. Run All Tests

Execute all tests in sequence:

```bash
npx ts-node scripts/run-all-spacetime-tests.ts
```

**This will**:
- Run all 4 test scripts
- Show results for each
- Display summary at the end

---

## Manual Browser Testing

### Test 1: Paid Player Flow

**Steps**:
1. Open your app in browser
2. Open DevTools → Console
3. Connect wallet (OnchainKit wallet button)
4. Look for: `✅ Linked wallet [address] to SpacetimeDB identity`
5. Start a paid game
6. Play and complete the game
7. Check console for game session logs

**Verify in SpacetimeDB**:
```bash
# View wallet mappings
spacetime sql beat-me "SELECT * FROM identity_wallet_mapping" -s maincloud

# View game sessions
spacetime sql beat-me "SELECT session_id, wallet_address, player_type, score FROM game_sessions ORDER BY started_at DESC LIMIT 5" -s maincloud

# View player stats
spacetime sql beat-me "SELECT wallet_address, total_games, total_score, total_earnings FROM player_stats" -s maincloud
```

**Expected**:
- `identity_wallet_mapping`: Has your wallet → identity mapping
- `game_sessions`: Has wallet_address populated (not null)
- `player_stats`: Has entry with your wallet_address as primary key

### Test 2: Trial Player Flow

**Steps**:
1. Open browser in incognito/private mode
2. Open DevTools → Console
3. DON'T connect wallet
4. Start a trial game
5. Complete the game
6. Check console logs

**Verify in SpacetimeDB**:
```bash
# View guest players
spacetime sql beat-me "SELECT guest_id, name, games_played, best_score FROM guest_players" -s maincloud

# View trial sessions
spacetime sql beat-me "SELECT session_id, guest_id, player_type, score FROM game_sessions WHERE guest_id IS NOT NULL LIMIT 5" -s maincloud
```

**Expected**:
- `guest_players`: Has entry with browser-generated guest_id
- `game_sessions`: Has guest_id populated (wallet_address is null)

### Test 3: Cross-Device Persistence

**Steps**:
1. Connect wallet and play game in Chrome
2. Note your wallet address
3. Close Chrome
4. Open Firefox
5. Connect SAME wallet
6. Check stats are preserved
7. Play another game
8. Verify stats accumulated

**Verify**:
```bash
# Query stats for your wallet
spacetime sql beat-me "SELECT * FROM player_stats WHERE wallet_address = '0xYourWalletAddress'" -s maincloud

# Should show accumulated stats from both browsers
```

### Test 4: Leaderboard Verification

**Steps**:
1. Have multiple paid players with different earnings
2. Query leaderboard:
   ```bash
   spacetime sql beat-me "SELECT wallet_address, username, total_earnings, games_played FROM players WHERE total_earnings > 0 ORDER BY total_earnings DESC LIMIT 10" -s maincloud
   ```
3. Verify sorted by total_earnings
4. Verify trial players NOT in this query

**Expected**:
```
 wallet_address | username | total_earnings | games_played 
----------------|----------|----------------|-------------
 0x...          | Alice    | 200.5          | 15
 0x...          | Bob      | 125.0          | 8
 0x...          | Charlie  | 50.25          | 3
```

---

## API Endpoint Testing

### Test Wallet Linking API

```bash
curl -X POST http://localhost:3000/api/start-spacetime-session \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_123",
    "difficulty": "medium",
    "gameMode": "battle",
    "playerType": "paid",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "sessionId": "test_123",
  "playerType": "paid",
  "playerId": "0x1234567890123456789012345678901234567890"
}
```

### Test Leaderboard API

```bash
# This endpoint needs to be created or use existing
curl http://localhost:3000/api/leaderboard?type=paid&limit=10
```

**Expected**: Players sorted by total_earnings

---

## Debugging Failed Tests

### Issue: "SpacetimeDB not configured"

**Fix**:
1. Check `.env.local` has SpacetimeDB variables
2. Restart dev server: `npm run dev`
3. Verify module is deployed: `spacetime list -s maincloud`

### Issue: "Wallet linking failed"

**Check**:
```bash
# View logs
spacetime logs beat-me -s maincloud -f

# Look for errors in link_wallet_to_identity reducer
```

**Common causes**:
- Module not deployed correctly
- Schema mismatch
- Network connectivity issues

### Issue: "Stats not found under wallet address"

**Verify schema**:
```bash
# Check player_stats table structure
spacetime sql beat-me "SELECT * FROM player_stats LIMIT 1" -s maincloud
```

**Should have**: `wallet_address` as column (not `player_identity`)

### Issue: "Trial players appearing on paid leaderboard"

**Verify**:
```bash
# Check what table getLeaderboard queries
# Should query: players table WHERE total_earnings > 0
# Should NOT query: player_stats or guest_players
```

---

## Continuous Testing During Development

### Watch SpacetimeDB Logs

Keep this running while testing:
```bash
spacetime logs beat-me -s maincloud -f
```

You'll see:
- `🔗 Linking wallet ...` when wallets connect
- `🎮 Started game session ...` when games start
- `📝 Recorded question attempt ...` when answers submitted
- `🏁 Ended game session ...` when games complete
- `✅ Updated paid player stats ...` when stats updated

### Live Query Player Stats

```bash
# Watch player stats update in real-time
watch -n 2 'spacetime sql beat-me "SELECT wallet_address, total_games, total_score, total_earnings FROM player_stats ORDER BY total_earnings DESC LIMIT 5" -s maincloud'
```

### Live Query Active Connections

```bash
# See who's connected
spacetime sql beat-me "SELECT spacetime_identity, wallet_address, connected_at FROM active_connections" -s maincloud
```

---

## Test Data Cleanup

### Reset Test Data

If you need to clear test data:

```bash
# Delete specific test player
spacetime sql beat-me "DELETE FROM players WHERE wallet_address = '0x1234...'" -s maincloud

# Clear ALL data (use carefully!)
spacetime publish --project-path spacetime-module/beat-me -s maincloud -c beat-me --yes
```

### Reset Local Test State

```bash
# Clear localStorage (in browser console)
localStorage.clear()

# Or just clear SpacetimeDB token
localStorage.removeItem('spacetime_auth_token')
```

---

## Expected Test Timeline

Running all tests should take approximately:

- **Test 1 (Wallet Identity)**: ~30 seconds
- **Test 2 (Trial Player)**: ~30 seconds
- **Test 3 (Leaderboard)**: ~45 seconds
- **Test 4 (Cross-Device)**: ~60 seconds
- **Total**: ~3 minutes

---

## Success Criteria

All tests pass if:

### Wallet Identity ✅
- [x] Wallet linked to identity
- [x] Game sessions have wallet_address
- [x] Stats stored under wallet_address
- [x] Leaderboard queryable

### Trial Players ✅
- [x] Guest player created
- [x] Game sessions have guest_id
- [x] NOT on paid leaderboard
- [x] Separate trial leaderboard works

### Leaderboards ✅
- [x] Paid ranked by total_earnings (USDC)
- [x] Sorting correct (descending)
- [x] Trial excluded from paid
- [x] No mixing between paid and trial

### Cross-Device ✅
- [x] Stats persist when reconnecting
- [x] Identity mapping updates
- [x] Stats accumulate from multiple devices

---

## Troubleshooting

### Tests timing out

**Increase delays** in test scripts:
```typescript
await new Promise(resolve => setTimeout(resolve, 2000)); // Increase from 1000
```

### Connection errors

**Check**:
1. Module is deployed: `spacetime list -s maincloud`
2. Module name is correct: `beat-me`
3. Network not blocking WebSocket connections

### Data not appearing

**Possible causes**:
1. Reducers failing silently - check logs
2. Schema mismatch - regenerate bindings
3. Subscription not applied - wait longer

---

## CI/CD Integration

### Add to package.json

```json
{
  "scripts": {
    "test:spacetime": "ts-node scripts/run-all-spacetime-tests.ts",
    "test:wallet": "ts-node scripts/test-wallet-identity-flow.ts",
    "test:trial": "ts-node scripts/test-trial-player-flow.ts",
    "test:leaderboard": "ts-node scripts/test-leaderboard-earnings.ts",
    "test:cross-device": "ts-node scripts/test-cross-device-persistence.ts"
  }
}
```

### Run via npm

```bash
npm run test:spacetime       # Run all tests
npm run test:wallet          # Just wallet flow
npm run test:trial           # Just trial flow
npm run test:leaderboard     # Just leaderboard
npm run test:cross-device    # Just cross-device
```

---

## Manual Verification Checklist

After running automated tests, manually verify:

### In Browser

- [ ] Connect wallet
- [ ] See console: `✅ Linked wallet [address] to SpacetimeDB identity`
- [ ] Start paid game
- [ ] Complete game
- [ ] Check leaderboard shows your wallet
- [ ] Disconnect and reconnect
- [ ] Stats still there

### In SpacetimeDB

- [ ] `identity_wallet_mapping` has entries
- [ ] `active_connections` shows connected users
- [ ] `game_sessions` has wallet_address for paid players
- [ ] `game_sessions` has guest_id for trial players
- [ ] `player_stats` uses wallet_address as primary key
- [ ] `players` table has total_earnings field
- [ ] Leaderboard query returns correct order

### In Console Logs

- [ ] No "Generic query method not implemented" warnings
- [ ] No "SpacetimeDB initialization failed" errors
- [ ] No "CDP API error: Unknown error" (should be specific)
- [ ] Wallet linking logs appear

---

## Performance Testing

### Load Test: Multiple Concurrent Players

Create script to simulate:
- 50 paid players connecting
- All starting games simultaneously
- Verify no race conditions in wallet linking

### Stress Test: Rapid Reconnections

- Connect/disconnect same wallet rapidly
- Verify identity mapping updates correctly
- Check for duplicate stat entries

---

## Regression Testing

After any schema changes, re-run all tests to ensure:
- Wallet linking still works
- Stats persist correctly
- Leaderboards sort properly
- Trial players stay separate

---

## Test Coverage

### Covered ✅
- Wallet linking to identity
- Paid player game flow
- Trial player game flow
- Stats persistence
- Cross-device scenarios
- Leaderboard sorting
- Player type separation

### Not Covered (Future Work)
- Guest → Paid migration
- Multiple wallets per identity
- Admin functions with wallet addresses
- Prize distribution linkage
- Real blockchain transaction integration

---

## Next Steps After Testing

1. **If all tests pass**: 
   - Deploy to production
   - Monitor logs for real user behavior
   - Collect metrics on cross-device usage

2. **If tests fail**:
   - Review error messages
   - Check SpacetimeDB logs: `spacetime logs beat-me -s maincloud`
   - Verify schema matches bindings
   - Check reducer logic in Rust code

3. **Integration with game flow**:
   - Update game components to use new API
   - Add wallet/guest ID parameters
   - Test with real gameplay

---

## Quick Test Commands

```bash
# Run all tests
npx ts-node scripts/run-all-spacetime-tests.ts

# View real-time logs during testing
spacetime logs beat-me -s maincloud -f

# Query results after tests
spacetime sql beat-me "SELECT * FROM players WHERE total_earnings > 0" -s maincloud
spacetime sql beat-me "SELECT wallet_address, total_games, total_earnings FROM player_stats" -s maincloud
spacetime sql beat-me "SELECT * FROM identity_wallet_mapping" -s maincloud

# Verify leaderboard order
spacetime sql beat-me "SELECT wallet_address, username, total_earnings FROM players WHERE total_earnings > 0 ORDER BY total_earnings DESC LIMIT 10" -s maincloud
```

---

## Success Criteria Summary

**All tests should show**:
- ✅ Wallets link to identities
- ✅ Paid players use wallet address
- ✅ Trial players use guest ID
- ✅ Stats persist across devices
- ✅ Leaderboard ranked by earnings
- ✅ Trial players excluded from paid leaderboard
- ✅ No data mixing or loss

**If you see all ✅ above, the system is working correctly!** 🎉

