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
   - Put `CRE_ETH_PRIVATE_KEY` (64 hex chars, **no** `0x`) in either:
     - `chainlink-cre-workflows/.env`, **or**
     - `weekly-prize-distribution/.env` — then pass **`-e weekly-prize-distribution/.env`** on every `cre workflow …` command (see `../ENV_SETUP.md`).

4. **Run CRE commands from the monorepo workflow root** (`chainlink-cre-workflows/`), not from this subfolder:
   ```bash
   cd ../   # chainlink-cre-workflows
   ```

5. **Test locally** (optional):
   ```bash
   cre workflow simulate weekly-prize-distribution -e weekly-prize-distribution/.env --target staging-settings --non-interactive --trigger-index 0
   ```

6. **Deploy & activate** (production example):
   ```bash
   cre workflow deploy weekly-prize-distribution -e weekly-prize-distribution/.env --target production-settings --yes
   cre workflow activate weekly-prize-distribution -e weekly-prize-distribution/.env --target production-settings --yes
   ```

7. **On-chain**: call `setChainlinkOracle(forwarder)` on `TriviaBattle` so `onReport` accepts CRE. See [CRE_DEPLOYMENT_STEPS.md](./CRE_DEPLOYMENT_STEPS.md) and `scripts/set-chainlink-oracle.sh` in the repo root.

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
1. Have the Keystone forwarder address set as `chainlinkOracle` (via `setChainlinkOracle(address)`)
2. Expose the view helpers the workflow reads (`isSessionActive`, `lastSessionTime`, `sessionInterval`, `getContractUsdcBalance`, `getCurrentPlayers`, `sessionCounter`, etc.); see `main.ts`
3. Allow `distributePrizes()` to be triggered via CRE `writeReport` / `onReport` (forwarder must match `chainlinkOracle`)

## Monitoring

After deployment, monitor your workflow in the CRE dashboard at [cre.chain.link](https://cre.chain.link).
