# Coinbase CDP Integration Setup

This guide will help you set up the Coinbase CDP (Coinbase Developer Platform) integration to monitor your TriviaBattle smart contract events in real-time.

## Prerequisites

1. A Coinbase CDP account
2. Your deployed TriviaBattle contract address: `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`
3. The contract ABI (already uploaded to CDP)

## Setup Steps

### 1. Get Your CDP API Key

1. Go to [Coinbase CDP Portal](https://portal.cdp.coinbase.com/projects/api-keys)
2. Create a new API key or use an existing one
3. Note down the following values from your API key:
   - API Key Name
   - Private Key
   - Project ID

### 2. Configure Environment Variables

Add these server-side environment variables to your deployment:

```bash
# CDP Configuration (server-side only)
CDP_API_KEY_NAME=your_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
CDP_PROJECT_ID=your_project_id

# Other server-side variables
IRON_PASSWORD=your_iron_password
ONCHAINKIT_API_KEY=your_onchainkit_api_key
```

**Note**: These are server-side environment variables and should not be exposed to the browser.

### 3. Register Your Contract (if not already done)

The contract should already be registered in CDP with the ABI you uploaded. If you need to register it manually, you can use the CDP SDK:

```typescript
import { SmartContract } from "@coinbase/coinbase-sdk";

const smartContract = await SmartContract.register({
  networkId: "base-mainnet",
  contractAddress: "0x231240B1d776a8F72785FE3707b74Ed9C3048B3a",
  abi: [/* Your contract ABI */],
  contractName: "TriviaBattle",
});
```

## Features

### Real-time Event Monitoring

The integration monitors these contract events:

- **PlayerJoined**: When players join the battle
- **ScoreSubmitted**: When players submit their scores
- **PrizesDistributed**: When prizes are distributed
- **SessionStarted**: When game sessions begin
- **SessionEnded**: When game sessions end
- **TrialPlayerJoined**: When trial players join
- **TrialScoreSubmitted**: When trial players submit scores

### Components

1. **PlayerActivityMonitor**: Lightweight component showing recent player activity
2. **CDPEventMonitor**: Full event monitor with detailed information
3. **CDPDashboard**: Admin dashboard with analytics and statistics

### API Endpoints

- `GET /api/cdp-events`: Fetch all contract events
- `GET /api/cdp-events?type=playerJoined`: Fetch specific event type
- `GET /api/cdp-events?fromBlock=123&toBlock=456`: Fetch events from specific block range

## Usage Examples

### In React Components

```typescript
import { useCDPEvents, usePlayerJoinedEvents } from '@/hooks/useCDPEvents';

// Monitor all events
const { events, loading, error } = useCDPEvents(30000); // Poll every 30 seconds

// Monitor specific events
const { events: playerEvents } = usePlayerJoinedEvents(15000); // Poll every 15 seconds
```

### Server-side API

```typescript
import { fetchPlayerJoinedEvents } from '@/lib/apis/cdp';

// Fetch recent player joined events
const events = await fetchPlayerJoinedEvents();
```

## Configuration

### Polling Intervals

- **Game UI**: 30 seconds (lightweight monitoring)
- **Admin Dashboard**: 10 seconds (real-time analytics)
- **Player Activity**: 15 seconds (frequent updates)

### Error Handling

The integration includes comprehensive error handling:

- CDP initialization failures
- Network connectivity issues
- Invalid API keys
- Contract not found errors

## Troubleshooting

### Common Issues

1. **"CDP not initialized" error**
   - Check that all required environment variables are set:
     - `CDP_API_KEY_NAME`
     - `CDP_API_KEY_PRIVATE_KEY`
     - `CDP_PROJECT_ID`
   - Verify the values are correct and not expired

2. **"Contract not found" error**
   - Ensure the contract is registered in CDP
   - Verify the contract address is correct

3. **No events showing**
   - Check that the contract has emitted events
   - Verify the block range parameters
   - Ensure the contract is deployed on Base mainnet

4. **"Missing required CDP environment variables" error**
   - Ensure all three CDP environment variables are set
   - Check that the variables are available server-side (not client-side)

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

This will show detailed CDP API calls and responses in the console.

## Security Notes

- Keep your CDP API credentials secure and never commit them to version control
- These are server-side environment variables and should not be exposed to the browser
- Use environment variables for all sensitive configuration
- Consider using a secrets management service for production deployments
- The CDP API key credentials are only used server-side for API calls

## Performance Considerations

- The CDP SDK caches responses to minimize API calls
- Polling intervals are configurable to balance real-time updates with API limits
- Events are fetched in batches to reduce network overhead

## Support

For issues with the CDP integration:

1. Check the [Coinbase CDP Documentation](https://docs.cdp.coinbase.com/)
2. Review the CDP Portal for contract registration status
3. Check the browser console for detailed error messages
4. Verify your API key permissions in the CDP Portal
