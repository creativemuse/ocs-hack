# Chainlink CRE Workflows

This directory contains Chainlink CRE (Chainlink Runtime Environment) workflows for automating TriviaBattle contract operations.

## Workflows

### weekly-prize-distribution

Automatically distributes prizes from the TriviaBattle contract on a weekly schedule using a cron trigger.

- **Trigger**: Cron (weekly on Sundays at 00:00 UTC)
- **Action**: Calls `distributePrizes()` on the contract
- See [weekly-prize-distribution/README.md](./weekly-prize-distribution/README.md) for setup and usage instructions.

### session-monitor

Monitors TriviaBattle contract events for session lifecycle and player activity using EVM log triggers.

- **Trigger**: EVM Log (SessionStarted, PlayerJoined events)
- **Action**: Logs and tracks session/player activity
- See [session-monitor/README.md](./session-monitor/README.md) for setup and usage instructions.

### prize-distribution-monitor

Monitors prize distribution events from the TriviaBattle contract using EVM log triggers.

- **Trigger**: EVM Log (PrizesDistributed events)
- **Action**: Logs winner information and prize amounts
- See [prize-distribution-monitor/README.md](./prize-distribution-monitor/README.md) for setup and usage instructions.

## Getting Started

1. **Install CRE CLI**:
   ```bash
   # Follow instructions at https://docs.chain.link/cre/getting-started/cli-installation
   ```

2. **Create CRE Account**:
   - Sign up at [cre.chain.link](https://cre.chain.link)
   - Log in with CLI: `cre login`

3. **Initialize Project** (if starting fresh):
   ```bash
   cre init
   ```

4. **Workflow Setup**:
   - Navigate to a workflow directory and install dependencies: `bun install`
   - Return to project root: `cd ..`
   - Configure contract addresses in config files
   - Test locally: `cre workflow simulate <workflow-folder-name> --target staging-settings` (from project root)

## Project Structure

```
chainlink-cre-workflows/
├── project.yaml                      # Global project configuration
├── .env                              # Environment variables (not committed)
├── weekly-prize-distribution/       # Cron-triggered prize distribution
│   ├── main.ts
│   ├── workflow.yaml
│   ├── config.staging.json
│   ├── config.production.json
│   ├── package.json
│   └── README.md
├── session-monitor/                  # EVM log trigger for session events
│   ├── main.ts
│   ├── workflow.yaml
│   ├── config.staging.json
│   ├── config.production.json
│   ├── package.json
│   └── README.md
└── prize-distribution-monitor/       # EVM log trigger for prize events
    ├── main.ts
    ├── workflow.yaml
    ├── config.staging.json
    ├── config.production.json
    ├── package.json
    └── README.md
```

## Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [CRE Getting Started Guide](https://docs.chain.link/cre/getting-started/overview)
- [CRE SDK Reference](https://docs.chain.link/cre/reference/sdk)
