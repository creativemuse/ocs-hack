# ⚠️ CRE Workflow Deployment: Insufficient Gas Funds

## 🔴 **Issue**

The deployment failed with:
```
Error: insufficient funds for gas * price + value: 
  have 148447257788692 wei (~0.0001484 ETH)
  want 153279827412576 wei (~0.000153 ETH)
```

**The wallet doesn't have enough ETH to pay for the deployment transaction.**

---

## ✅ **Solution: Fund Your Wallet**

The CRE workflow deployment happens on **Ethereum Mainnet** (not Base Mainnet), so you need ETH in your wallet.

### Step 1: Check Your Wallet Balance

The wallet address being used is shown in the deployment output:
```
Owner Address: 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294
```

Check the balance:
```bash
# Check balance on Ethereum mainnet
cast balance 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 --rpc-url https://eth.llamarpc.com
```

### Step 2: Send ETH to Your Wallet

You need at least **0.0002 ETH** (to cover gas with some buffer). Send ETH from:
- Another wallet
- An exchange (Coinbase, Binance, etc.)
- A faucet (if testing with small amounts)

**To address:** `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`  
**Amount needed:** ~0.0002 ETH (or more for safety)  
**Network:** Ethereum Mainnet

### Step 3: Verify Balance

After sending, verify the balance:
```bash
cast balance 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 --rpc-url https://eth.llamarpc.com
```

### Step 4: Retry Deployment

Once funded, retry the deployment:

```bash
cd chainlink-cre-workflows/weekly-prize-distribution
cre workflow deploy weekly-prize-distribution --target production-settings
```

---

## 📋 **Why Ethereum Mainnet?**

The CRE workflow registration happens on **Ethereum Mainnet**, even though your workflow interacts with Base Mainnet. This is because:

- CRE's workflow registry contract is on Ethereum Mainnet
- Workflows are registered globally and can interact with any supported chain
- The deployment transaction goes to Ethereum, but the workflow execution happens on Base

---

## 💰 **Estimated Costs**

- **Deployment Transaction:** ~0.000153 ETH (one-time)
- **Activation:** Usually included in deployment or minimal cost
- **Ongoing:** Workflow execution costs are paid by CRE infrastructure

---

## 🔍 **Additional Notes**

1. **Gas Price**: The transaction shows gas price of `0.10097699 gwei`, which is very low. This suggests you might be using a wallet configured for a lower-fee environment.

2. **Wallet Source**: The wallet address comes from your `CRE_ETH_PRIVATE_KEY` in your `.env` file or CRE account configuration.

3. **Network**: Make sure you're sending ETH to **Ethereum Mainnet**, not Base or any other network.

---

## ✅ **Quick Fix Checklist**

- [ ] Check wallet balance on Ethereum Mainnet
- [ ] Send at least 0.0002 ETH to `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`
- [ ] Wait for transaction confirmation
- [ ] Verify new balance
- [ ] Retry deployment command

---

## 🚀 **After Funding**

Once your wallet is funded, simply run:

```bash
cd chainlink-cre-workflows/weekly-prize-distribution
cre workflow deploy weekly-prize-distribution --target production-settings
cre workflow activate weekly-prize-distribution --target production-settings
```

The deployment should succeed! 🎉
