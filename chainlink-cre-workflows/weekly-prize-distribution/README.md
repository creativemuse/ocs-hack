# Weekly Prize Distribution Workflow

This Chainlink CRE workflow automatically distributes prizes from the TriviaBattle contract on a weekly schedule.

## Overview

- **Trigger**: Cron schedule (default: Every Sunday at 00:00 UTC)
- **Function**: Calls `distributePrizes()` on the TriviaBattle contract
- **Conditions**: Only executes if:
  - Session has ended
  - Prizes not already distributed
  - Prize pool > 0

## Setup

1. **Install dependencies**:
   ```bash
   cd chainlink-cre-workflows/weekly-prize-distribution
   bun install
   ```

2. **Configure contract address**:
   - Update `config.staging.json` with your testnet contract address
   - Update `config.production.json` with your mainnet contract address

3. **Set up environment variables**:
   - Create a `.env` file in the project root with:
     ```
     CRE_ETH_PRIVATE_KEY=your_private_key_here
     ```

4. **Test locally**:
   ```bash
   cre workflow simulate weekly-prize-distribution --target staging-settings
   ```

5. **Deploy to CRE** (requires Early Access):
   ```bash
   cre workflow deploy weekly-prize-distribution --target staging-settings
   cre workflow activate weekly-prize-distribution --target staging-settings
   ```

## Configuration

### Schedule

The default schedule is `"0 0 * * 0"` (every Sunday at midnight UTC).

To change the schedule, update the `schedule` field in your config file. Examples:
- Daily at midnight: `"0 0 * * *"`
- Every Monday at 9 AM UTC: `"0 9 * * 1"`
- Every 7 days: `"0 0 */7 * *"`

### Gas Limit

Adjust the `gasLimit` in your config file based on your contract's gas requirements. The default is 500,000.

## Contract Requirements

The TriviaBattle contract must:
1. Have `chainlinkForwarder` address set (via `setChainlinkForwarder()`)
2. Implement `getSessionInfo()` view function
3. Allow `distributePrizes()` to be called by the Chainlink forwarder

## Monitoring

After deployment, monitor your workflow in the CRE dashboard at [cre.chain.link](https://cre.chain.link).
