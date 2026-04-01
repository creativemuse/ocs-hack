# Update Chainlink CRE Workflow for Base Mainnet Deployment

## ✅ **Contract Address Updated**

The CRE workflow configuration has been updated with your new Base Mainnet contract address:

**Contract Address:** `0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f`  
**Network:** Base Mainnet (`ethereum-mainnet-base-1`)

---

## 📋 **Steps to Connect CRE to Your Contract**

### Step 1: Deploy/Redeploy the CRE Workflow

The workflow config has been updated. Now deploy it to production:

```bash
cd chainlink-cre-workflows/weekly-prize-distribution

# Install dependencies (if not already done)
bun install

# Test the workflow locally first (recommended)
cre workflow simulate weekly-prize-distribution --target production-settings

# Deploy the workflow to CRE production
cre workflow deploy weekly-prize-distribution --target production-settings

# Activate the workflow
cre workflow activate weekly-prize-distribution --target production-settings
```

---

### Step 2: Get the Chainlink Forwarder Address

After deploying the workflow, you need to get the Chainlink forwarder address:

**Option A: From CRE Dashboard**
1. Go to [cre.chain.link](https://cre.chain.link)
2. Navigate to your workflow: `weekly-prize-dist-prod`
3. Find the forwarder/executor address in the workflow details

**Option B: From CRE CLI**  
The CRE CLI has no `workflow status` command. Use the dashboard for runtime details, or `cre workflow hash weekly-prize-distribution --target production-settings` for local workflow hashes.

**Option C: Use Base Mainnet Forwarder Address**
- **Base KeystoneForwarder:** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` ✅

**Note:** The forwarder address is the address that CRE uses to call your contract. Your contract's `chainlinkOracle` must be set to this address for the workflow to work.

---

### Step 3: Set Chainlink Oracle Address on Contract

Once you have the forwarder address, set it on your deployed contract:

```bash
# Set the Chainlink oracle (forwarder) address
cast send 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
  "setChainlinkOracle(address)" <FORWARDER_ADDRESS> \
  --rpc-url base_mainnet \
  --private-key $PRIVATE_KEY
```

**Run this command:**
```bash
# Base Mainnet KeystoneForwarder address
cast send 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
  "setChainlinkOracle(address)" 0xF8344CFd5c43616a4366C34E3EEE75af79a74482 \
  --rpc-url base_mainnet \
  --private-key $PRIVATE_KEY
```

---

### Step 4: Verify the Setup

```bash
# Verify chainlinkOracle is set correctly
cast call 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
  "chainlinkOracle()" \
  --rpc-url base_mainnet

# Should return the forwarder address you set
```

---

## 🔄 **How the Workflow Works**

1. **Schedule:** Runs every Sunday at 00:00 UTC (`"0 0 * * 0"`)
2. **Checks:**
   - Reads contract state (session status, prize pool, player count)
   - Verifies if distribution is needed
3. **Conditions for Distribution:**
   - Session has ended (`!isSessionActive` OR `currentTime > endTime`)
   - Prizes not already distributed
   - Prize pool > 0
   - At least one player joined
4. **Action:** Calls `distributePrizes()` via Chainlink forwarder

---

## ✅ **Contract Requirements**

Your contract already has everything needed:

- ✅ `distributePrizes()` function exists
- ✅ `onlyOwnerOrChainlink` modifier allows CRE to call it
- ✅ `setChainlinkOracle(address)` function exists to set the forwarder
- ✅ View functions exist: `isSessionActive()`, `sessionCounter()`, `getCurrentPlayers()`, `getContractUsdcBalance()`, etc.

---

## 📊 **Monitoring the Workflow**

After deployment, monitor your workflow:

Use the [CRE dashboard](https://cre.chain.link) for status, runs, and logs (no `cre workflow status` / `workflow logs` in current CLI).

---

## 🧪 **Testing Before Production**

1. **Test on Staging First:**
   ```bash
   # Make sure staging config has correct testnet contract
   cre workflow simulate weekly-prize-distribution --target staging-settings
   ```

2. **Manual Test After Setup:**
   - Start a session: `cast send <CONTRACT> "startNewSession()" ...`
   - Wait for session to end (or manually end it)
   - Verify CRE workflow picks it up on next cron run

---

## ⚠️ **Important Notes**

1. **Forwarder Address:** The `chainlinkOracle` on your contract **must** match the CRE forwarder address, otherwise `distributePrizes()` will revert with `TriviaBattle__Unauthorized`.

2. **First Distribution:** The workflow will skip distribution if `sessionCounter = 0` (no session started yet). This is expected behavior.

3. **Schedule:** The workflow runs weekly on Sunday at midnight UTC. You can change this in `config.production.json` if needed.

4. **Gas Limit:** Current gas limit is 500,000. Adjust if needed based on your contract's gas usage.

---

## 🔗 **Quick Reference**

**Contract Address:** `0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f`  
**Network:** Base Mainnet  
**CRE Workflow:** `weekly-prize-dist-prod`  
**Schedule:** Every Sunday 00:00 UTC  
**Function Called:** `distributePrizes()`

---

## ✅ **Checklist**

- [x] Contract deployed to Base Mainnet
- [x] CRE workflow config updated with contract address
- [ ] CRE workflow deployed to production
- [ ] Forwarder address obtained from CRE
- [ ] `chainlinkOracle` set on contract to forwarder address
- [ ] Workflow activated and running
- [ ] First session started to test workflow

---

## 🎯 **Next Steps**

1. **Deploy the workflow** (commands above)
2. **Get forwarder address** from CRE dashboard or CLI
3. **Set forwarder on contract** using `setChainlinkOracle()`
4. **Start first session** and test the workflow

Your CRE workflow will now automatically distribute prizes every week!
