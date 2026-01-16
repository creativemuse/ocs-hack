# Session Monitor Workflow

This workflow monitors TriviaBattle contract events using EVM log triggers.

## Events Monitored

- **SessionStarted**: Triggered when a new game session begins
- **PlayerJoined**: Triggered when a player joins a session

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
   cre workflow simulate session-monitor --target staging-settings
   ```

4. **Deploy to CRE**:
   ```bash
   # From the chainlink-cre-workflows directory
   cre workflow deploy session-monitor --target staging-settings
   cre workflow deploy session-monitor --target production-settings
   ```

## Usage

Once deployed, this workflow will automatically:
- Listen for `SessionStarted` events and log session information
- Listen for `PlayerJoined` events and log player activity

You can extend this workflow to:
- Send notifications when sessions start
- Track player participation metrics
- Trigger other workflows based on events
- Update external systems (databases, APIs, etc.)
