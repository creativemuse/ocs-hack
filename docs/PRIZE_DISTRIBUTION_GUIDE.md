# Prize Distribution Guide

## Overview

Prize distribution in your TriviaBattle contract is **owner-only** and does **NOT** need paymaster sponsorship. Here's how it works:

## How Prize Distribution Works

### 1. Prize Pool Accumulation
```solidity
// When players join, 97.5% goes to prize pool
uint256 platformFee = (ENTRY_FEE * PLATFORM_FEE_BPS) / 10000; // 2.5%
uint256 prizePoolContribution = ENTRY_FEE - platformFee;     // 97.5%
currentSession.prizePool += prizePoolContribution;
```

### 2. Who Can Distribute Prizes?
```solidity
function distributePrizes() external onlyOwner onlySessionEnded nonReentrant
```

**IMPORTANT:** 
- ✅ **Only the contract owner** can call `distributePrizes()`
- ✅ **NOT sponsored by paymaster** - owner pays gas
- ✅ **Trial players are EXCLUDED** from prizes (anti-abuse)
- ✅ **Only paid players** receive prizes

### 3. Prize Distribution Breakdown
```solidity
uint256 firstPrize = (totalPrizePool * 50) / 100;  // 50% to 1st place
uint256 secondPrize = (totalPrizePool * 30) / 100; // 30% to 2nd place
uint256 thirdPrize = (totalPrizePool * 15) / 100;  // 15% to 3rd place
uint256 participationPrize = (totalPrizePool * 5) / 100; // 5% split among others
```

**Top 10 paid players** get prizes:
- 🥇 1st Place: 50% of prize pool
- 🥈 2nd Place: 30% of prize pool
- 🥉 3rd Place: 15% of prize pool
- 4th-10th: Share 5% participation pool

## Paymaster Allowlist - Prize Distribution

### ❌ distributePrizes() Does NOT Need Allowlist

**Why?**
1. It's an `onlyOwner` function
2. Contract owner (you) pays the gas
3. Not called by regular users
4. Not sponsored by paymaster

### ✅ Player Functions That DO Need Allowlist

These functions need to be in your paymaster allowlist because **users call them**:

**USDC Contract** (`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`):
- `approve` - Users approve USDC spending

**TriviaBattle Contract** (`0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`):
- `joinBattle` - Paid players join games
- `joinTrialBattle` - Trial players join games  
- `submitScore` - Paid players submit scores
- `submitTrialScore` - Trial players submit scores

## How to Distribute Prizes

### Option 1: Manual Distribution (Current Setup)

As the contract owner, you manually call `distributePrizes()`:

```typescript
// Using your wallet (owner)
const contract = new ethers.Contract(
  TRIVIA_CONTRACT_ADDRESS,
  TRIVIA_ABI,
  ownerSigner
);

// After session ends
await contract.distributePrizes();
```

**Pros:**
- ✅ Full control over when prizes are distributed
- ✅ Can verify scores before distribution
- ✅ Owner pays gas (not from prize pool)

**Cons:**
- ❌ Requires manual intervention
- ❌ Players wait for owner action
- ❌ Owner pays gas fees

### Option 2: Automated Distribution (Recommended)

Set up a backend service to auto-distribute:

```typescript
// Backend cron job or API endpoint
async function autoDistributePrizes() {
  const sessionInfo = await contract.getSessionInfo();
  
  // Check if session ended and prizes not distributed
  if (!sessionInfo.isActive && !sessionInfo.prizesDistributed) {
    const now = Math.floor(Date.now() / 1000);
    
    // Wait 5 minutes after session ends (for late submissions)
    if (now > sessionInfo.endTime + 300) {
      // Call distributePrizes as contract owner
      const tx = await contract.distributePrizes();
      await tx.wait();
      
      console.log('✅ Prizes distributed automatically');
    }
  }
}

// Run every minute
setInterval(autoDistributePrizes, 60000);
```

**Pros:**
- ✅ Fully automated
- ✅ Players get prizes quickly
- ✅ No manual intervention needed

**Cons:**
- ❌ Need backend service running
- ❌ Still owner pays gas

### Option 3: Anyone Can Trigger (Contract Modification)

Modify contract to allow anyone to trigger (owner still pays):

```solidity
// Remove onlyOwner modifier
function distributePrizes() external onlySessionEnded nonReentrant {
    // ... existing logic
}
```

Then any user can trigger distribution (but prizes still go to winners correctly).

## Trial Player Restrictions

### ✅ Trial Players Are EXCLUDED from Prizes

From your contract:
```solidity
// Collect only paid player scores (trial players excluded from prize distribution)
ScoreEntry[] memory paidPlayerScores = new ScoreEntry[](currentSession.paidPlayers.length);

// Add only paid player scores
for (uint256 i = 0; i < currentSession.paidPlayers.length; i++) {
    address player = currentSession.paidPlayers[i];
    // ... only paid players added to ranking
}
```

**This prevents abuse** where someone creates 100 trial accounts to drain the prize pool!

## Current Contract Deployment

**Contract Address:** `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`  
**Network:** Base Mainnet (Chain ID: 8453)  
**Owner:** Check with: `await contract.owner()`

### Verify You're the Owner

```bash
# Using cast (Foundry)
cast call 0x231240B1d776a8F72785FE3707b74Ed9C3048B3a "owner()(address)" --rpc-url https://mainnet.base.org

# Or in your code
const owner = await contract.owner();
console.log('Contract owner:', owner);
console.log('Your address:', yourAddress);
console.log('You are owner:', owner.toLowerCase() === yourAddress.toLowerCase());
```

## Testing Prize Distribution

### 1. Start a Test Session

```typescript
// As owner
const tx = await contract.startSession(300); // 5 minutes
await tx.wait();
```

### 2. Have Players Join and Play

```typescript
// Players join and submit scores
// (These calls ARE sponsored by paymaster if in allowlist)
await contract.joinBattle(); // Paid player
await contract.submitScore(1000);
```

### 3. Wait for Session to End

```typescript
const sessionInfo = await contract.getSessionInfo();
console.log('Session ends at:', new Date(sessionInfo.endTime * 1000));
```

### 4. Distribute Prizes (Owner Only)

```typescript
// As contract owner - YOU pay gas
const tx = await contract.distributePrizes();
const receipt = await tx.wait();

console.log('✅ Prizes distributed!');
console.log('Transaction:', receipt.transactionHash);
```

### 5. Verify Prizes Were Sent

```typescript
// Check USDC balances of winners
const winner1Balance = await usdcContract.balanceOf(winner1Address);
console.log('Winner 1 USDC:', winner1Balance / 1e6);
```

## Monitoring Prize Pool

### Check Current Prize Pool

```typescript
const sessionInfo = await contract.getSessionInfo();
console.log('Current prize pool:', sessionInfo.prizePool / 1e6, 'USDC');
console.log('Paid players:', sessionInfo.paidPlayerCount);
console.log('Trial players:', sessionInfo.trialPlayerCount);
```

### Calculate Expected Prizes

```typescript
const prizePool = sessionInfo.prizePool / 1e6; // Convert to USDC

const prizes = {
  first: prizePool * 0.50,    // 50%
  second: prizePool * 0.30,   // 30%
  third: prizePool * 0.15,    // 15%
  participation: prizePool * 0.05 // 5%
};

console.log('Expected prizes:', prizes);
```

## Recommended Setup

### 1. Add User Functions to Paymaster Allowlist

**Required for sponsored transactions:**
- USDC: `approve`
- TriviaBattle: `joinBattle`, `joinTrialBattle`, `submitScore`, `submitTrialScore`

### 2. Keep distributePrizes Owner-Only

**Don't add to allowlist because:**
- Only you (owner) call it
- You pay gas (not users)
- Not a user-facing function

### 3. Set Up Automated Distribution (Optional)

Create a backend service to auto-call `distributePrizes()` after sessions end.

### 4. Monitor Prize Pool

Add dashboard to track:
- Current prize pool size
- Number of paid vs trial players
- When prizes need distribution

## Summary

✅ **Prize Distribution is Working Correctly**
- Only owner can distribute prizes
- Trial players are excluded (anti-abuse)
- Paid players compete for 50/30/15/5 split

✅ **Paymaster Allowlist** 
- DOES need: User functions (join, submit)
- DOES NOT need: `distributePrizes` (owner-only)

✅ **Next Steps**
1. Add user functions to paymaster allowlist
2. Verify you're the contract owner
3. Test distribution on testnet first
4. Consider automated distribution service

🎮 **Players will receive their prizes!** They just need you (owner) to call `distributePrizes()` after each session ends.
