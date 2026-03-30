# Starting Your First Session - Options

## ✅ **You Have Two Options**

### Option 1: Use the App (Recommended if Owner Wallet Connected) ✅

**Yes, you can start a session from your app!** 

The app has built-in functionality to automatically start a session if:
1. You connect the **contract owner's wallet** to the app
2. The app detects there's no active session
3. The connected wallet is the owner

**How it works:**
- The `useTriviaContract` hook automatically checks if a session is active
- If not active AND the connected wallet is the owner, it will automatically start a session
- This happens when you try to join a game or navigate to the game page

**Requirements:**
- Connect the contract owner's wallet (the wallet that deployed the contract)
- Ensure the app is on the correct network (Base Mainnet)

---

### Option 2: Use Cast Command (Direct)

If you prefer to start it manually or the app isn't working:

```bash
cast send 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
  "startNewSession()" \
  --rpc-url base_mainnet \
  --private-key $PRIVATE_KEY
```

---

## 🔍 **How the App Checks for Sessions**

The app automatically:
1. **Checks session status** when you connect a wallet
2. **Verifies ownership** - compares connected wallet to contract owner
3. **Starts session if needed** - if you're the owner and no session exists

Look for these console logs:
```
✅ You are the contract owner, attempting to start session...
Starting new trivia session...
Session start transaction submitted, waiting for confirmation...
```

---

## ⚠️ **Important Notes**

1. **Only Owner Can Start Sessions**: The `startNewSession()` function has an `onlyOwner` modifier, so only the contract owner can start sessions.

2. **Check Owner Address**: Verify which wallet is the contract owner:
   ```bash
   cast call 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
     "owner()" \
     --rpc-url base_mainnet
   ```

3. **Network Must Match**: Make sure your app is connected to Base Mainnet (not testnet).

---

## 🎯 **Recommended Approach**

**Try the app first:**
1. Connect the owner's wallet to your app
2. Navigate to the game/entry page
3. The app should automatically detect and start a session if needed

**If it doesn't work:**
- Check console logs for errors
- Verify the connected wallet is the contract owner
- Use the cast command as a fallback

---

## 📊 **Check Session Status**

After starting (either method), verify the session is active:

```bash
cast call 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
  "isSessionActive()" \
  --rpc-url base_mainnet
```

**Expected:** `true`

---

## ✅ **Summary**

- ✅ **App works** - Connect owner wallet and let it auto-start
- ✅ **Cast command works** - Manual control if needed
- ⚠️ **Owner wallet required** - Only contract owner can start sessions

**Try the app first - it should work seamlessly if the owner wallet is connected!** 🚀
