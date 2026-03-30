# ⚠️ Session Interval Wait Required

## 🔴 **Issue**

You're getting the error:
```
TriviaBattle__SessionIntervalNotElapsed
```

This happens because the contract enforces a minimum time interval between sessions.

---

## 📊 **Current Contract State**

**Session Interval:** 604,800 seconds (7 days / 1 week)  
**Last Session Time:** Set to deployment timestamp when contract was created  
**Status:** No active session (you can't start a new one yet)

---

## ⏰ **Why This Happens**

When the contract was deployed, the constructor set:
```solidity
lastSessionTime = block.timestamp;
```

The `startNewSession()` function requires:
```solidity
if (block.timestamp < lastSessionTime + sessionInterval) {
    revert TriviaBattle__SessionIntervalNotElapsed();
}
```

So you must wait **1 week** from the deployment time before starting the first session.

---

## ✅ **Solutions**

### Option 1: Wait for the Interval (Current Behavior)

Wait until the interval has elapsed (7 days from deployment), then start a session.

---

### Option 2: Modify Contract to Allow First Session Immediately (If Needed)

If you want to start a session immediately after deployment, you'd need to modify the contract to allow the first session. However, this would require redeploying the contract.

**Possible modification:**
```solidity
function startNewSession() external onlyOwner {
    if (isSessionActive) {
        revert TriviaBattle__SessionIntervalNotElapsed();
    }
    
    // Allow first session immediately (when sessionCounter is 0)
    if (sessionCounter > 0 && block.timestamp < lastSessionTime + sessionInterval) {
        revert TriviaBattle__SessionIntervalNotElapsed();
    }
    // ... rest of function
}
```

---

### Option 3: Check When You Can Start

Calculate when the next session can start:

```bash
# Get current values
SESSION_INTERVAL=$(cast call 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f "sessionInterval()" --rpc-url base_mainnet | cast to-dec)
LAST_SESSION=$(cast call 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f "lastSessionTime()" --rpc-url base_mainnet | cast to-dec)

# Calculate next session time
NEXT_SESSION=$((LAST_SESSION + SESSION_INTERVAL))

echo "Next session can start at timestamp: $NEXT_SESSION"
echo "Current timestamp: $(date +%s)"
echo "Wait: $((NEXT_SESSION - $(date +%s))) seconds"
```

---

## 🎯 **Recommended Approach**

**For production:** This is actually a **good security feature** - it prevents session spam and ensures proper timing between games. The 7-day interval ensures sessions run weekly, which aligns with your CRE workflow schedule.

**For testing:** If you need to test immediately, you have two options:
1. Wait the 7 days
2. Deploy a test contract with a shorter interval (e.g., 1 hour for testing)

---

## 📋 **Current Behavior is Correct**

The contract is working as designed:
- ✅ Prevents session spam
- ✅ Enforces weekly schedule
- ✅ Aligns with CRE workflow (runs weekly on Sundays)
- ✅ Ensures proper prize pool accumulation

**Your CRE workflow will automatically handle prize distribution weekly**, so the session interval ensures sessions align with this schedule.

---

## ⏰ **Next Steps**

1. **Wait for the interval to pass** (7 days from deployment)
2. **Then start your first session** using the app or cast command
3. **Or modify the contract** if you need immediate testing (requires redeployment)

---

**Summary:** The contract requires a 7-day wait from deployment before starting the first session. This is intentional and aligns with the weekly prize distribution schedule. You'll need to wait or modify the contract if immediate testing is required.
