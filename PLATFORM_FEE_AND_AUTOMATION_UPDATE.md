# Platform Fee and Weekly Automation Update

## Summary

Updated the TriviaBattle contract to:
1. **Raise platform fee to 7%** collected at distribution time (instead of 2.5% at entry)
2. **Enable weekly automated prize distribution** via Chainlink CRE

## Contract Changes (`contracts/TriviaBattle.sol`)

### 1. Platform Fee Changes

- **Platform fee increased**: From 2.5% (250 BPS) to 7% (700 BPS)
- **Fee collection timing**: Platform fee is now collected **at distribution time** instead of at entry
- **Entry fees**: 100% of entry fees now go to the prize pool initially
- **Distribution calculation**: 7% is deducted from the total prize pool before distributing to winners

### 2. Weekly Distribution Automation

- **Chainlink forwarder support**: Added `chainlinkForwarder` address and `setChainlinkForwarder()` function
- **Authorization**: Added `onlyOwnerOrChainlink` modifier to allow Chainlink CRE to call `distributePrizes()`
- **Weekly tracking**: Added `lastDistributionTime` and `WEEK_DURATION` constants
- **Time enforcement**: `distributePrizes()` now checks that at least 1 week has passed since last distribution
- **Default session duration**: Changed from 5 minutes to 1 week (604800 seconds)

### 3. Event Updates

- Updated `PlayerJoined` event to remove `platformFee` parameter (no longer collected at entry)
- Updated `PrizesDistributed` event to include `platformFee` amount
- Added `ChainlinkForwarderUpdated` event

## Chainlink CRE Workflow

Created a new Chainlink CRE workflow in `chainlink-cre-workflows/weekly-prize-distribution/` that:

- **Triggers weekly**: Runs every Sunday at 00:00 UTC (configurable via cron schedule)
- **Checks conditions**: Verifies session has ended, prizes not distributed, and prize pool > 0
- **Calls contract**: Executes `distributePrizes()` when conditions are met
- **Error handling**: Returns detailed results for monitoring

## Setup Instructions

### 1. Deploy Updated Contract

```bash
# Compile the updated contract
npm run compile

# Deploy to your network
npm run deploy:sepolia  # or deploy:base for mainnet
```

### 2. Configure Chainlink Forwarder

After deploying the contract, you need to set the Chainlink forwarder address:

```solidity
// Call this function on your deployed contract
contract.setChainlinkForwarder(chainlinkForwarderAddress);
```

**Note**: You'll need to obtain the Chainlink forwarder address from Chainlink CRE. This is typically provided when you deploy your workflow.

### 3. Set Up Chainlink CRE Workflow

1. **Install CRE CLI**:
   ```bash
   # Follow instructions at https://docs.chain.link/cre/getting-started/cli-installation
   ```

2. **Create CRE Account**:
   - Sign up at [cre.chain.link](https://cre.chain.link)
   - Log in: `cre login`

3. **Configure Workflow**:
   ```bash
   cd chainlink-cre-workflows/weekly-prize-distribution
   
   # Update contract address in config files
   # Edit config.staging.json and config.production.json
   # Replace "YOUR_CONTRACT_ADDRESS_HERE" with your deployed contract address
   
   # Install dependencies
   bun install
   ```

4. **Test Locally**:
   ```bash
   # From project root
   cre workflow simulate weekly-prize-distribution --target staging-settings
   ```

5. **Deploy to CRE** (requires Early Access):
   ```bash
   cre workflow deploy weekly-prize-distribution --target staging-settings
   cre workflow activate weekly-prize-distribution --target staging-settings
   ```

6. **Get Forwarder Address**:
   - After deploying the workflow, get the forwarder address from the CRE dashboard
   - Set it on your contract: `contract.setChainlinkForwarder(forwarderAddress)`

## Important Notes

### Contract Compatibility

The current workflow implementation uses CRE's `writeReport` method, which requires the contract to accept CRE reports. However, your contract uses a simpler `onlyOwnerOrChainlink` modifier pattern.

**Two options**:

1. **Option A (Recommended)**: Use CRE's forwarder pattern
   - The Chainlink forwarder will call your contract's `distributePrizes()` function
   - The `onlyOwnerOrChainlink` modifier will allow the forwarder to execute
   - This is the simplest approach

2. **Option B**: Modify contract to accept CRE reports
   - Implement Chainlink's `ReceiverTemplate` pattern
   - More complex but provides additional security features

### Weekly Distribution Timing

- The workflow runs every Sunday at 00:00 UTC by default
- The contract enforces a minimum 1-week interval between distributions
- If a distribution is attempted before 1 week has passed, it will fail

### Platform Fee Calculation

**Before (Old System)**:
- Entry fee: 1 USDC
- Platform fee at entry: 0.025 USDC (2.5%)
- Prize pool contribution: 0.975 USDC (97.5%)

**After (New System)**:
- Entry fee: 1 USDC
- Prize pool contribution: 1 USDC (100%)
- At distribution: 7% of total prize pool goes to platform
- Winners receive: 93% of total prize pool

**Example**:
- 100 players join = 100 USDC in prize pool
- Platform fee: 7 USDC (7%)
- Distribution pool: 93 USDC (93%)
- Winners split the 93 USDC according to prize structure

## Testing

### Test Contract Changes

1. **Test entry fee flow**:
   ```solidity
   // Entry fee should go 100% to prize pool
   contract.joinBattle();
   // Check: prizePool should increase by 1 USDC
   ```

2. **Test distribution**:
   ```solidity
   // After session ends and scores submitted
   contract.distributePrizes();
   // Check: 7% should be transferred to platformFeeRecipient
   // Check: 93% should be distributed to winners
   ```

3. **Test weekly enforcement**:
   ```solidity
   // Try to distribute twice in same week
   contract.distributePrizes(); // Should succeed
   contract.distributePrizes(); // Should fail: "Weekly distribution not due"
   ```

### Test CRE Workflow

```bash
# Simulate the workflow locally
cre workflow simulate weekly-prize-distribution --target staging-settings

# Check logs to verify:
# - Session state is read correctly
# - Conditions are checked properly
# - Transaction is submitted (if conditions met)
```

## Migration Considerations

If you have an existing deployed contract:

1. **Deploy new contract** with updated code
2. **Migrate any existing prize pools** (if needed)
3. **Update frontend** to use new contract address
4. **Set up Chainlink CRE workflow** with new contract address
5. **Configure forwarder** on new contract

## Files Changed

- `contracts/TriviaBattle.sol` - Updated contract with 7% fee and Chainlink support
- `chainlink-cre-workflows/` - New directory with CRE workflow for weekly distribution

## Next Steps

1. ✅ Contract updated with 7% platform fee
2. ✅ Contract updated with Chainlink forwarder support
3. ✅ CRE workflow created
4. ⏳ Deploy updated contract
5. ⏳ Set up CRE account and deploy workflow
6. ⏳ Configure forwarder address on contract
7. ⏳ Test end-to-end flow
