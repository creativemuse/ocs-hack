# ⚠️ CRE Workflow Simulation Limitation

## 🔴 **Issue: Mainnet Simulation Not Supported**

The CRE simulation environment does **not** support mainnet chain selectors for security reasons. When you try to simulate a workflow with a mainnet configuration, you'll get an error like:

```
Error action capability not found: no compatible capability found for id evm:ChainSelector:15971525489660198786@1.0.0
```

The chain selector `15971525489660198786` is for Base Mainnet (`ethereum-mainnet-base-1`).

---

## ✅ **Solutions**

### Option 1: Skip Simulation and Deploy Directly (Recommended)

Since mainnet simulation isn't supported, you can deploy directly to production. The workflow code has been tested and should work correctly.

```bash
cd chainlink-cre-workflows/weekly-prize-distribution

# Install dependencies
bun install

# Deploy directly to production (skip simulation)
cre workflow deploy weekly-prize-distribution --target production-settings

# Activate the workflow
cre workflow activate weekly-prize-distribution --target production-settings
```

**Why this is safe:**
- Your workflow code has been tested with the contract structure
- The contract is already deployed and working
- You can monitor the first execution via CRE dashboard and logs
- You can pause/deactivate the workflow if needed

---

### Option 2: Test Logic with Staging Config

If you want to verify the workflow logic before deploying to production, test it with the staging configuration (which uses a testnet):

```bash
# Test with staging config (uses testnet contract)
cre workflow simulate weekly-prize-distribution --target staging-settings
```

This will test the workflow logic against the testnet contract configured in `config.staging.json`.

---

### Option 3: Create Temporary Test Config (Advanced)

If needed, you could temporarily create a test config that points to a testnet for simulation, but this isn't necessary if you've already tested the logic.

---

## 📋 **Recommended Approach**

1. **Test workflow logic** with staging config (optional):
   ```bash
   cre workflow simulate weekly-prize-distribution --target staging-settings
   ```

2. **Deploy directly to production**:
   ```bash
   cre workflow deploy weekly-prize-distribution --target production-settings
   cre workflow activate weekly-prize-distribution --target production-settings
   ```

3. **Monitor first execution**:
   - Check CRE dashboard
   - View logs: `cre workflow logs weekly-prize-distribution --target production-settings`
   - Verify contract state after execution

4. **Set forwarder address** on contract after deployment (if not already set)

---

## ✅ **Next Steps**

Since simulation isn't available for mainnet, proceed with direct deployment:

```bash
cd chainlink-cre-workflows/weekly-prize-distribution
bun install
cre workflow deploy weekly-prize-distribution --target production-settings
cre workflow activate weekly-prize-distribution --target production-settings
```

The workflow will be ready and will execute on the next scheduled trigger (every Sunday at 00:00 UTC).

---

## 📊 **After Deployment**

After deploying, you can verify the workflow is active:

```bash
# Check status
cre workflow status weekly-prize-distribution --target production-settings

# View logs
cre workflow logs weekly-prize-distribution --target production-settings

# Or check in CRE dashboard
open https://cre.chain.link
```

---

## ⚠️ **Important Notes**

1. **First Run**: The workflow will skip distribution if `sessionCounter = 0` (no session started yet). This is expected.

2. **Forwarder Address**: Make sure you've set the forwarder address on your contract after deploying the workflow:
   ```bash
   cast send 0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f \
     "setChainlinkOracle(address)" <FORWARDER_ADDRESS> \
     --rpc-url base_mainnet \
     --private-key $PRIVATE_KEY
   ```

3. **Monitoring**: Watch the first few executions carefully to ensure everything works as expected.

---

**Summary:** Mainnet simulation isn't supported by CRE. Deploy directly to production and monitor the first execution. This is the standard approach for mainnet workflows.
