# Chainlink CRE Workflows Overview

This document provides an overview of all Chainlink CRE workflows configured for the TriviaBattle contract.

## Available Workflows

### 1. Weekly Prize Distribution (`weekly-prize-distribution`)

**Type**: Cron Trigger  
**Schedule**: Every Sunday at 00:00 UTC (`0 0 * * 0`)

**Purpose**: Automatically distributes prizes from the TriviaBattle contract when a session ends.

**Functionality**:
- Checks if the current session has ended
- Verifies that prizes haven't already been distributed
- Ensures minimum players requirement is met
- Calls `distributePrizes()` on the contract
- Handles errors gracefully

**Configuration**:
- Staging: `config.staging.json`
- Production: `config.production.json`

**Deployment**:
```bash
# Install dependencies
cd weekly-prize-distribution
bun install
cd ..

# Test first (from project root)
cre workflow simulate weekly-prize-distribution --target staging-settings
# Then deploy
cre workflow deploy weekly-prize-distribution --target staging-settings
cre workflow deploy weekly-prize-distribution --target production-settings
```

---

### 2. Session Monitor (`session-monitor`)

**Type**: EVM Log Trigger  
**Events Monitored**: 
- `SessionStarted(uint256,uint256)`
- `PlayerJoined(address,uint256)`

**Purpose**: Monitors session lifecycle and player activity in real-time.

**Functionality**:
- Listens for `SessionStarted` events and logs session information
- Listens for `PlayerJoined` events and logs player activity
- Can be extended to send notifications, update databases, or trigger other workflows

**Configuration**:
- Staging: `config.staging.json`
- Production: `config.production.json`

**Deployment** (from `chainlink-cre-workflows/`; production contract in `session-monitor/config.production.json`):
```bash
bun install --cwd session-monitor
cre workflow deploy session-monitor --target production-settings --yes
cre workflow activate session-monitor --target production-settings --yes
```
Staging: use `--target staging-settings` and `config.staging.json`.

---

### 3. Prize Distribution Monitor (`prize-distribution-monitor`)

**Type**: EVM Log Trigger  
**Events Monitored**: 
- `PrizesDistributed(uint256,address[],uint256[])`

**Purpose**: Monitors prize distribution events to track winners and prize amounts.

**Functionality**:
- Listens for `PrizesDistributed` events
- Logs winner addresses and prize amounts
- Tracks total prize pool distributions
- Can be extended to send winner notifications, update leaderboards, or record in databases

**Configuration**:
- Staging: `config.staging.json`
- Production: `config.production.json`

**Deployment**:
```bash
# Install dependencies
cd prize-distribution-monitor
bun install
cd ..

# Test first (from project root)
cre workflow simulate prize-distribution-monitor --target staging-settings
# Then deploy
cre workflow deploy prize-distribution-monitor --target staging-settings
cre workflow deploy prize-distribution-monitor --target production-settings
```

---

## Workflow Architecture

```
chainlink-cre-workflows/
├── project.yaml                      # Global RPC configuration
├── weekly-prize-distribution/        # Cron-triggered automation
│   ├── main.ts                       # Workflow logic
│   ├── workflow.yaml                 # CRE workflow config
│   ├── config.staging.json           # Staging environment
│   └── config.production.json        # Production environment
├── session-monitor/                   # Event-driven monitoring
│   ├── main.ts                       # Event handlers
│   ├── workflow.yaml                 # CRE workflow config
│   ├── config.staging.json           # Staging environment
│   └── config.production.json        # Production environment
└── prize-distribution-monitor/       # Event-driven monitoring
    ├── main.ts                       # Event handlers
    ├── workflow.yaml                 # CRE workflow config
    ├── config.staging.json           # Staging environment
    └── config.production.json        # Production environment
```

## Getting Started

1. **Install CRE CLI**:
   ```bash
   # Follow instructions at https://docs.chain.link/cre/getting-started/cli-installation
   ```

2. **Create CRE Account**:
   - Sign up at [cre.chain.link](https://cre.chain.link)
   - Log in: `cre login`

3. **Configure Contract Addresses**:
   - Update contract addresses in each workflow's config files
   - Production configs currently have placeholder: `YOUR_CONTRACT_ADDRESS_HERE`

4. **Test Locally**:
   ```bash
   # Navigate to the project root (chainlink-cre-workflows directory)
   cd chainlink-cre-workflows
   
   # Test the workflow (use workflow folder name, not .)
   cre workflow simulate <workflow-folder-name> --target staging-settings
   
   # Example:
   # cre workflow simulate session-monitor --target staging-settings
   ```

5. **Deploy Workflows**:
   ```bash
   # From the project root (chainlink-cre-workflows directory)
   cd chainlink-cre-workflows
   
   # Deploy to staging first
   cre workflow deploy <workflow-folder-name> --target staging-settings
   
   # Then deploy to production
   cre workflow deploy <workflow-folder-name> --target production-settings
   
   # Example:
   # cre workflow deploy session-monitor --target staging-settings
   ```

## Contract Requirements

For workflows to function properly, the TriviaBattle contract must:

1. **For Weekly Prize Distribution**:
   - Have `chainlinkOracle` set to the CRE forwarder address
   - Implement `onlyOwnerOrChainlink` modifier on `distributePrizes()`

2. **For Event Monitors**:
   - Emit events: `SessionStarted`, `PlayerJoined`, `PrizesDistributed`
   - Events must match the expected signatures

## Monitoring and Debugging

- View runs, history, and logs in the [CRE dashboard](https://cre.chain.link) (the CLI has no `workflow status` or `workflow logs` subcommands).
- Optional: `cre workflow hash <workflow-folder>` prints binary/config/workflow hashes for comparison with on-chain registration.

## Extending Workflows

Each workflow can be extended to:
- Send notifications (email, SMS, webhooks)
- Update external databases
- Trigger other workflows
- Integrate with analytics platforms
- Send alerts for specific conditions

## Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [CRE Getting Started Guide](https://docs.chain.link/cre/getting-started/overview)
- [CRE SDK Reference](https://docs.chain.link/cre/reference/sdk)
