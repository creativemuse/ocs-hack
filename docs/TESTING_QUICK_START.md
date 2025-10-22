# Testing Quick Start Guide

Run these commands to verify your SpacetimeDB wallet identity system works correctly.

---

## ⚡ Quick Commands

### Run All Tests (Recommended)
```bash
npm run test:spacetime-all
```

**This will**:
- Test wallet identity flow
- Test trial player flow  
- Test leaderboard earnings sorting
- Test cross-device persistence
- Show summary of all results

**Time**: ~3 minutes

---

## Individual Tests

### 1. Test Paid Player (Wallet-Based)
```bash
npm run test:wallet-flow
```

**Verifies**:
- ✅ Wallet linking works
- ✅ Game sessions store wallet address
- ✅ Stats saved under wallet address
- ✅ Leaderboard queries work

**Time**: ~30 seconds

---

### 2. Test Trial Player (Guest-Based)
```bash
npm run test:trial-flow
```

**Verifies**:
- ✅ Guest player creation
- ✅ Trial sessions use guest ID
- ✅ NOT on paid leaderboard
- ✅ Separate trial leaderboard

**Time**: ~30 seconds

---

### 3. Test Leaderboard Sorting
```bash
npm run test:leaderboard
```

**Verifies**:
- ✅ Ranked by cumulative USDC earnings
- ✅ Sorted descending correctly
- ✅ Trial players excluded
- ✅ No mixing of player types

**Time**: ~45 seconds

---

### 4. Test Cross-Device Persistence
```bash
npm run test:cross-device
```

**Verifies**:
- ✅ Stats persist with same wallet
- ✅ Different identities properly linked
- ✅ Stats accumulate across devices
- ✅ All sessions queryable by wallet

**Time**: ~60 seconds

---

## Expected Results

### ✅ Success Output

```
🧪 Testing Wallet Identity Flow...

1️⃣ Initializing SpacetimeDB connection...
✅ Connected to SpacetimeDB

2️⃣ Linking wallet to SpacetimeDB identity...
✅ Wallet linked

3️⃣ Creating player profile...
✅ Player created

4️⃣ Starting game session...
✅ Game session started

5️⃣ Verifying game session...
✅ Session found in database:
   Wallet Address: 0x1234...
   Player Type: Paid
✅ Wallet address correctly stored

6️⃣ Recording question attempts...
✅ Question attempt recorded

7️⃣ Ending game session...
✅ Game session ended

8️⃣ Verifying player stats...
✅ Stats PERSISTED across devices:
   Total Games: 1
   Total Score: 10

✅ ALL TESTS PASSED!
```

### ❌ Failure Output

```
❌ TEST FAILED: Error: CDP SQL API error: Unknown error
Error details: Failed to link wallet

Check:
1. Is SpacetimeDB module deployed?
2. Are env variables set?
3. Is the server running?
```

---

## Troubleshooting

### "SpacetimeDB not configured"

**Fix**:
```bash
# Add to .env.local
NEXT_PUBLIC_SPACETIME_HOST=https://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIME_MODULE=beat-me
SPACETIME_HOST=https://maincloud.spacetimedb.com
SPACETIME_MODULE=beat-me
```

### "Connection timeout"

**Check module is deployed**:
```bash
spacetime list -s maincloud
# Should show: beat-me
```

### "Wallet linking failed"

**View logs**:
```bash
spacetime logs beat-me -s maincloud -f
```

Look for errors in `link_wallet_to_identity` reducer

---

## Live Monitoring During Tests

### Watch Logs (Terminal 1)
```bash
spacetime logs beat-me -s maincloud -f
```

### Run Tests (Terminal 2)
```bash
npm run test:spacetime-all
```

### View Results (Terminal 3)
```bash
# After tests complete
spacetime sql beat-me "SELECT * FROM players WHERE total_earnings > 0" -s maincloud
spacetime sql beat-me "SELECT * FROM identity_wallet_mapping" -s maincloud
spacetime sql beat-me "SELECT wallet_address, total_games FROM player_stats" -s maincloud
```

---

## What Each Test Does

### test:wallet-flow
1. Links wallet to identity
2. Creates player profile
3. Starts paid game
4. Records question attempts
5. Ends game
6. Verifies stats under wallet address

### test:trial-flow
1. Creates guest player
2. Starts trial game with guest ID
3. Records guest game
4. Updates guest stats
5. Verifies NOT on paid leaderboard

### test:leaderboard
1. Creates 5 players with different earnings
2. Queries leaderboard
3. Verifies sorted by earnings DESC
4. Confirms trial players excluded

### test:cross-device
1. Plays game on "Device 1"
2. Disconnects
3. Reconnects (simulates Device 2)
4. Verifies stats persisted
5. Plays another game
6. Verifies stats accumulated

---

## Success Criteria

**All tests pass if you see**:
- ✅ No error messages
- ✅ "ALL TESTS PASSED" for each test
- ✅ Summary shows all checkmarks
- ✅ Exit code 0

**If any test fails**:
- Review error message
- Check SpacetimeDB logs
- Verify environment variables
- Ensure module is deployed

---

## Manual Browser Test (Quick)

Don't want to run scripts? Test manually:

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser** → http://localhost:3000

3. **Open DevTools Console**

4. **Connect wallet** (click wallet button)

5. **Look for**:
   ```
   ✅ Connected to SpacetimeDB with identity: [hex]
   ✅ Linked wallet [address] to SpacetimeDB identity
   ```

6. **Start a paid game** and play

7. **Check console** for game logs

8. **Verify in database**:
   ```bash
   spacetime sql beat-me "SELECT * FROM game_sessions WHERE wallet_address IS NOT NULL LIMIT 1" -s maincloud
   ```

If you see your wallet address in the query result, **it's working!** ✅

---

## Time Estimates

| Test | Duration | Priority |
|------|----------|----------|
| All tests combined | ~3 min | ⭐⭐⭐ High |
| Wallet flow | ~30 sec | ⭐⭐⭐ High |
| Trial flow | ~30 sec | ⭐⭐ Medium |
| Leaderboard | ~45 sec | ⭐⭐⭐ High |
| Cross-device | ~60 sec | ⭐⭐ Medium |

**Recommended**: Run `npm run test:spacetime-all` first to verify everything

---

## Next Steps After Testing

✅ **If all pass**: System is working! Integrate into your game flow  
❌ **If any fail**: Check logs, verify env vars, review error messages  

See `TESTING_GUIDE.md` for detailed troubleshooting.

