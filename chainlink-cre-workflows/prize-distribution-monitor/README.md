# Prize Distribution Monitor Workflow

This workflow monitors `PrizesDistributed` events from the TriviaBattle contract using EVM log triggers.

## Events Monitored

- **PrizesDistributed**: Triggered when prizes are distributed to winners after a session ends

## Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Configure contract address**:
   - Update `config.staging.json` for staging environment
   - Update `config.production.json` for production environment

3. **Test locally**:
   ```bash
   # From the chainlink-cre-workflows directory (project root where project.yaml is)
   cd chainlink-cre-workflows
   cre workflow simulate prize-distribution-monitor --target staging-settings
   ```

4. **Deploy to CRE**:
   ```bash
   # From the chainlink-cre-workflows directory
   cre workflow deploy prize-distribution-monitor --target staging-settings
   cre workflow deploy prize-distribution-monitor --target production-settings
   ```

## Usage

Once deployed, this workflow will automatically:
- Listen for `PrizesDistributed` events
- Log winner addresses and prize amounts
- Track total prize pool distributions

You can extend this workflow to:
- Send winner notifications
- Update leaderboards
- Record distributions in databases
- Trigger analytics updates
- Send webhook notifications
