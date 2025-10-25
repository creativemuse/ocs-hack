# Chainlink Automation Deployment Guide

This guide walks you through deploying and registering an automation-compatible smart contract using Chainlink Automation with a custom logic trigger.

## Overview

Chainlink Automation allows your smart contracts to execute functions automatically based on:
- **Custom logic triggers** (time-based or state-based conditions)
- **Log event triggers** (events emitted by contracts)
- **Time-based schedules** (cron-like execution)

This guide focuses on **custom logic triggers** using the `AutomationCounter` example contract.

## Prerequisites

### 1. Required Tools
- Foundry installed and configured
- Node.js and npm/pnpm
- A wallet with testnet ETH (Sepolia)
- Testnet LINK tokens for funding upkeeps

### 2. Environment Setup

Create or update your `.env` file with the following variables:

```bash
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

⚠️ **Security Warning**: Never commit your `.env` file or private keys to version control!

## Step 1: Understanding the Contract

The `AutomationCounter` contract (`contracts/AutomationCounter.sol`) implements:

### Key Components

1. **AutomationCompatibleInterface**: Required interface from Chainlink
   ```solidity
   import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
   ```

2. **checkUpkeep()**: Called offchain by Chainlink nodes to determine if upkeep is needed
   ```solidity
   function checkUpkeep(bytes calldata)
       external view override
       returns (bool upkeepNeeded, bytes memory)
   {
       upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
   }
   ```

3. **performUpkeep()**: Executed onchain when checkUpkeep returns true
   ```solidity
   function performUpkeep(bytes calldata) external override {
       if ((block.timestamp - lastTimeStamp) > interval) {
           lastTimeStamp = block.timestamp;
           counter = counter + 1;
           emit CounterIncremented(counter, block.timestamp);
       }
   }
   ```

### How It Works

1. Chainlink nodes continuously call `checkUpkeep()` offchain
2. When `checkUpkeep()` returns `true` (interval has passed), nodes call `performUpkeep()` onchain
3. The counter increments and emits an event
4. The cycle repeats automatically

## Step 2: Deploy the Contract

### Option A: Deploy to Sepolia Testnet (Recommended for Testing)

```bash
# Deploy with default 60-second interval
./deploy-automation-sepolia.sh

# Or specify custom interval (in seconds)
./deploy-automation-sepolia.sh 120
```

### Option B: Deploy to Ethereum Mainnet (Production)

```bash
# Deploy with default 1-hour interval
./deploy-automation-mainnet.sh

# Or specify custom interval
./deploy-automation-mainnet.sh 3600
```

### Manual Deployment (Advanced)

If you prefer manual deployment:

```bash
# Build contracts
forge build

# Deploy with custom interval
forge script script/DeployAutomationCounter.s.sol:DeployAutomationCounter \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

### Deployment Output

After successful deployment, you'll see:

```
=================================
Deployment Complete!
=================================
AutomationCounter deployed to: 0x1234567890abcdef1234567890abcdef12345678
Update Interval: 60 seconds
Initial Counter Value: 0
=================================
```

**📋 Copy the contract address** - you'll need it for registration!

## Step 3: Get Testnet LINK Tokens

Before registering your upkeep, you need LINK tokens to fund it.

### For Sepolia:
1. Visit [Chainlink Faucet](https://faucets.chain.link/sepolia)
2. Connect your wallet
3. Request testnet LINK tokens
4. Wait for confirmation

### For Mainnet:
1. Purchase LINK on an exchange (Coinbase, Binance, etc.)
2. Transfer to your wallet
3. Ensure you have enough for your desired upkeep duration

## Step 4: Register the Upkeep

### A. Navigate to Chainlink Automation UI

**Sepolia Testnet:**
- URL: https://automation.chain.link/sepolia

**Ethereum Mainnet:**
- URL: https://automation.chain.link/mainnet

### B. Register New Upkeep

1. **Click "Register new Upkeep"**

2. **Select Trigger Type:**
   - Choose **"Custom logic"**
   - This allows your contract's checkUpkeep logic to determine execution

3. **Enter Contract Details:**
   - **Contract address:** Paste your deployed contract address
   - The UI will automatically detect the AutomationCompatibleInterface
   - You should see checkUpkeep and performUpkeep functions detected

4. **Configure Upkeep Settings:**

   **Upkeep name:** Give it a descriptive name
   ```
   Example: "AutomationCounter - 60s Interval"
   ```

   **Gas limit:** Set the maximum gas for performUpkeep
   ```
   Recommended: 500000 (500k)
   For simple operations: 200000 (200k)
   ```

   **Starting balance:** Amount of LINK to fund the upkeep
   ```
   Testnet: 5-10 LINK
   Mainnet: Calculate based on:
     - Expected gas price
     - Execution frequency
     - Desired runtime duration
   ```

   **Check data (optional):** Leave empty unless you need to pass specific data to checkUpkeep
   ```
   For this example: Leave blank (0x)
   ```

5. **Review and Confirm:**
   - Check all details
   - Approve the LINK token spend
   - Confirm the registration transaction
   - Wait for transaction confirmation

### C. Upkeep Registration Complete

After registration, you'll receive:
- **Upkeep ID:** Unique identifier for your upkeep
- **Dashboard URL:** Link to monitor your upkeep

## Step 5: Monitor Your Upkeep

### Automation Dashboard

The dashboard shows:
- ✅ **Upkeep status** (Active/Paused/Cancelled)
- 📊 **Execution history** (successful and failed executions)
- ⛽ **Gas usage** per execution
- 💰 **LINK balance** remaining
- 📈 **Performance metrics**

### Contract Monitoring

You can also interact with your contract directly:

```bash
# Using cast (Foundry)
cast call <CONTRACT_ADDRESS> "counter()" --rpc-url $SEPOLIA_RPC_URL

# Check interval
cast call <CONTRACT_ADDRESS> "interval()" --rpc-url $SEPOLIA_RPC_URL

# Get time until next upkeep
cast call <CONTRACT_ADDRESS> "getTimeUntilNextUpkeep()" --rpc-url $SEPOLIA_RPC_URL
```

### What to Watch For

✅ **Success Indicators:**
- Counter increments regularly
- Executions happen at expected intervals
- LINK balance decreases predictably

⚠️ **Warning Signs:**
- Failed executions (check gas limits)
- Irregular execution times (network congestion)
- Rapidly depleting LINK balance (gas price spikes)

## Step 6: Manage Your Upkeep

### Add More LINK Funding

When your LINK balance gets low:
1. Go to your upkeep in the dashboard
2. Click "Add funds"
3. Enter LINK amount and confirm

### Pause Upkeep

To temporarily stop executions:
1. Go to your upkeep dashboard
2. Click "Pause"
3. Confirm transaction

### Cancel Upkeep

To permanently stop and withdraw remaining LINK:
1. Go to your upkeep dashboard
2. Click "Cancel upkeep"
3. Confirm transaction
4. Remaining LINK will be returned to your wallet

## Troubleshooting

### Issue: "checkUpkeep must return true"

**Problem:** Upkeep isn't executing
**Solution:**
- Verify your interval has passed since deployment
- Check contract state with cast commands
- Ensure checkUpkeep logic is correct

### Issue: "performUpkeep transaction failed"

**Problem:** Onchain execution failing
**Solution:**
- Increase gas limit in upkeep settings
- Check performUpkeep logic for reverts
- Verify contract has necessary permissions

### Issue: "Insufficient LINK balance"

**Problem:** Upkeep ran out of funding
**Solution:**
- Add more LINK immediately
- Set up low balance email alerts
- Calculate appropriate initial funding

### Issue: "Upkeep not being executed"

**Problem:** No executions happening
**Solution:**
- Verify upkeep is Active (not Paused)
- Check LINK balance is sufficient
- Ensure checkUpkeep is returning true
- Review Chainlink Automation status page

## Best Practices

### 1. Gas Optimization
- Keep performUpkeep logic simple and gas-efficient
- Avoid loops with unbounded iterations
- Use storage efficiently (minimize SSTORE operations)

### 2. Security
- Validate all inputs in performUpkeep
- Use reentrancy guards if making external calls
- Consider using the Forwarder pattern for additional security
- Revalidate conditions in performUpkeep (as shown in example)

### 3. Monitoring
- Set up email/SMS alerts for low LINK balance
- Monitor execution frequency and gas costs
- Keep track of failed executions

### 4. Testing
- Always test on testnet first (Sepolia)
- Verify all edge cases
- Test with different gas prices
- Simulate network congestion scenarios

### 5. Economics
- Calculate break-even point for your use case
- Monitor gas prices and adjust funding accordingly
- Consider batch operations to reduce per-execution costs

## Advanced: Custom Logic Examples

### Time-Based with State Check
```solidity
function checkUpkeep(bytes calldata) external view override
    returns (bool upkeepNeeded, bytes memory)
{
    bool timeElapsed = (block.timestamp - lastTimeStamp) > interval;
    bool conditionMet = someState == expectedValue;
    upkeepNeeded = timeElapsed && conditionMet;
}
```

### Dynamic Interval
```solidity
function checkUpkeep(bytes calldata) external view override
    returns (bool upkeepNeeded, bytes memory)
{
    uint256 dynamicInterval = calculateInterval(); // Your custom logic
    upkeepNeeded = (block.timestamp - lastTimeStamp) > dynamicInterval;
}
```

### Multiple Conditions
```solidity
function checkUpkeep(bytes calldata) external view override
    returns (bool upkeepNeeded, bytes memory performData)
{
    if (condition1) {
        upkeepNeeded = true;
        performData = abi.encode(1);
    } else if (condition2) {
        upkeepNeeded = true;
        performData = abi.encode(2);
    }
}

function performUpkeep(bytes calldata performData) external override {
    uint256 action = abi.decode(performData, (uint256));
    if (action == 1) {
        // Do action 1
    } else if (action == 2) {
        // Do action 2
    }
}
```

## Resources

### Official Documentation
- [Chainlink Automation Docs](https://docs.chain.link/chainlink-automation)
- [Automation Best Practices](https://docs.chain.link/chainlink-automation/guides/compatible-contracts)
- [Chainlink Contracts GitHub](https://github.com/smartcontractkit/chainlink)

### Useful Links
- [Sepolia Automation Dashboard](https://automation.chain.link/sepolia)
- [Mainnet Automation Dashboard](https://automation.chain.link/mainnet)
- [Chainlink Faucet](https://faucets.chain.link/)
- [Chainlink Status Page](https://status.chain.link/)

### Support
- [Chainlink Discord](https://discord.gg/chainlink)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/chainlink)
- [Chainlink GitHub Issues](https://github.com/smartcontractkit/chainlink/issues)

## Summary Checklist

- [ ] Contract implements AutomationCompatibleInterface
- [ ] Contract deployed and verified on target network
- [ ] Contract address copied and saved
- [ ] LINK tokens acquired for funding
- [ ] Upkeep registered on Chainlink Automation
- [ ] Gas limit set appropriately
- [ ] Initial LINK funding sufficient
- [ ] Upkeep monitoring dashboard bookmarked
- [ ] Low balance alerts configured
- [ ] Testing completed on testnet before mainnet

---

**Need Help?** If you encounter issues not covered in this guide, please refer to the official Chainlink documentation or reach out to the Chainlink community on Discord.

