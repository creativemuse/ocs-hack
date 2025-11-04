# CDP Onchain Webhook Setup Guide

**Status**: ✅ **READY FOR CONFIGURATION**

This guide explains how to configure Coinbase Developer Platform (CDP) Onchain Webhooks for your TriviaBattlev4 contract.

---

## Overview

CDP Onchain Webhooks provide:
- **Guaranteed Delivery**: At-least-once delivery guarantee
- **Robust Retries**: Exponential backoff with up to 60 retries per event
- **Fresh Data**: < 500ms end-to-end from tip of chain
- **Real-time Notifications**: Get notified instantly when contract events occur

---

## Prerequisites

1. **CDP API Key**: Create a Secret API Key at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
   - Go to [API Keys](https://portal.cdp.coinbase.com/projects/api-keys)
   - Select **Create API key** under **Secret API Keys** tab
   - Save your API Key ID and Secret securely

2. **Install cdpcurl** (optional, for CLI):
   ```bash
   # With Homebrew
   brew tap coinbase/cdpcurl && brew install cdpcurl
   
   # Or with Go
   go install github.com/coinbase/cdpcurl@latest
   ```

3. **Webhook URL**: Your production webhook endpoint
   - URL: `https://beatme.creativeplatform.xyz/api/webhook`
   - Must be HTTPS

---

## Contract Information

**Contract Address**: `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`  
**Network**: Base Mainnet  
**Contract Name**: TriviaBattlev4

**Key Events to Monitor**:
- `PrizeClaimed` - When players claim their winnings
- `PlayerEntered` - When players join a game
- `GameCreated` - When a new game session starts
- `GameFinalized` - When a game ends and prizes are distributed
- `RankingsSubmitted` - When Chainlink Functions submits rankings

---

## Step 1: Create Webhook Subscription

### Option A: Using CDP Portal (Recommended)

1. Go to [CDP Portal](https://portal.cdp.coinbase.com)
2. Navigate to **Webhooks** → **Create Webhook**
3. Fill in the form:
   - **Webhook URL**: `https://beatme.creativeplatform.xyz/api/webhook`
   - **Network Type**: Base Mainnet
   - **Event Type**: `onchain.activity.detected`
   - **Smart contract addresses**: `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`
   - **Event Name**: (Select events you want to monitor, e.g., `PrizeClaimed`)
4. **Copy the Webhook Signature** from the response (in `metadata.secret`)

### Option B: Using cdpcurl (CLI)

Create `subscription.json`:

```json
{
  "description": "TriviaBattlev4 Contract Events",
  "eventTypes": [
    "onchain.activity.detected"
  ],
  "target": {
    "url": "https://beatme.creativeplatform.xyz/api/webhook",
    "method": "POST"
  },
  "labels": {
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_name": "PrizeClaimed",
    "network": "base-mainnet"
  },
  "isEnabled": true
}
```

Create the subscription:

```bash
cdpcurl -X POST \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions" \
  -d @subscription.json
```

**Response**:
```json
{
  "createdAt": "2025-01-01T00:00:00Z",
  "description": "TriviaBattlev4 Contract Events",
  "eventTypes": ["onchain.activity.detected"],
  "isEnabled": true,
  "labels": {
    "project": "<YOUR_CDP_PROJECT_ID>",
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_name": "PrizeClaimed",
    "network": "base-mainnet"
  },
  "metadata": {
    "secret": "<WEBHOOK_SECRET_FOR_VERIFICATION>"
  },
  "subscriptionId": "<YOUR_SUBSCRIPTION_ID>",
  "target": {
    "url": "https://beatme.creativeplatform.xyz/api/webhook"
  }
}
```

**Important**: Copy the `metadata.secret` value - this is your `WEBHOOK_SECRET`.

---

## Step 2: Configure Environment Variables

Add these to your Vercel environment variables:

```bash
# Webhook secret from CDP subscription response (metadata.secret)
WEBHOOK_SECRET=<paste_secret_from_cdp_response>

# Set provider to CDP
WEBHOOK_PROVIDER=cdp
```

### Generate Webhook Secret (Alternative)

If you need to generate your own secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then configure this in both:
- Your environment variables
- CDP webhook subscription (if supported)

---

## Step 3: Verify Webhook Setup

### Health Check

Test your webhook endpoint:

```bash
curl https://beatme.creativeplatform.xyz/api/webhook
```

**Expected Response**:
```json
{
  "status": "ok",
  "webhookConfigured": true,
  "provider": "cdp",
  "signatureVerification": "enabled",
  "environment": "production"
}
```

### Test Webhook (using webhook.site)

1. Get a test URL from [webhook.site](https://webhook.site)
2. Temporarily update your CDP subscription to use the test URL
3. Trigger a contract event (e.g., claim a prize)
4. Verify the webhook payload is received

---

## Webhook Payload Structure

CDP Onchain Webhooks send events in this format:

```json
{
  "eventType": "onchain.activity.detected",
  "subscriptionId": "sub_1234567890",
  "labels": {
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_name": "PrizeClaimed",
    "network": "base-mainnet",
    "project": "your-project-id"
  },
  "data": {
    "blockNumber": 12345678,
    "blockHash": "0x...",
    "transactionHash": "0x...",
    "transactionIndex": 5,
    "logIndex": 2,
    "address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "eventName": "PrizeClaimed",
    "eventSignature": "PrizeClaimed(uint256,address,uint256,uint256)",
    "decodedData": {
      "gameId": "1",
      "player": "0x1234...",
      "amount": "500000",
      "ranking": "1"
    },
    "topics": ["0x..."],
    "data": "0x..."
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Supported Events

The webhook handler processes these contract events:

### PrizeClaimed
```typescript
{
  gameId: bigint,
  player: address,
  amount: uint256,
  ranking: uint256
}
```
**Action**: Updates prize claim status in database

### PlayerEntered
```typescript
{
  gameId: bigint,
  player: address,
  totalPlayers: uint256
}
```
**Action**: Records player entry in game session

### GameCreated
```typescript
{
  gameId: bigint,
  startTime: uint256,
  endTime: uint256
}
```
**Action**: Creates new game session record

### GameFinalized
```typescript
{
  gameId: bigint,
  prizePool: uint256,
  platformFee: uint256
}
```
**Action**: Finalizes game and prepares prize distribution

### RankingsSubmitted
```typescript
{
  gameId: bigint,
  rankedPlayerCount: uint256
}
```
**Action**: Records that Chainlink Functions submitted rankings

---

## Multiple Event Subscriptions

To monitor multiple events, create separate subscriptions:

### Subscription 1: Prize Claims
```json
{
  "labels": {
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_name": "PrizeClaimed"
  }
}
```

### Subscription 2: Player Entries
```json
{
  "labels": {
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_name": "PlayerEntered"
  }
}
```

### Subscription 3: All Events (using event_signature)
```json
{
  "labels": {
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_signature": "PrizeClaimed(uint256,address,uint256,uint256)"
  }
}
```

---

## Managing Subscriptions

### List All Subscriptions

```bash
cdpcurl -X GET \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions"
```

### View Subscription Details

```bash
cdpcurl -X GET \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions/<SUBSCRIPTION_ID>"
```

### Update Subscription

```bash
cdpcurl -X PUT \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions/<SUBSCRIPTION_ID>" \
  -d '{
    "description": "Updated: TriviaBattlev4 Events",
    "isEnabled": true
  }'
```

### Delete Subscription

```bash
cdpcurl -X DELETE \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions/<SUBSCRIPTION_ID>"
```

---

## Signature Verification

CDP Onchain Webhooks use the `X-Hook0-Signature` header with a complex format:
```
t=1728394718,h=content-type x-hook0-id,v1=a1b2c3d4e5f6...
```

The webhook endpoint automatically:

1. ✅ Extracts signature components (timestamp, header names, signature)
2. ✅ Builds signed payload: `timestamp.headerNames.headerValues.rawBody`
3. ✅ Generates expected signature using HMAC SHA-256 with `WEBHOOK_SECRET`
4. ✅ Compares signatures using timing-safe comparison
5. ✅ Verifies timestamp to prevent replay attacks (5-minute window)
6. ✅ Rejects invalid signatures with 401 Unauthorized

**Signature Format**: `t=timestamp,h=headerNames,v1=hexSignature`

---

## Integration Examples

### Process Prize Claims

When a `PrizeClaimed` event is received:

```typescript
// In app/api/webhook/route.ts - handleCDPWebhook function
case 'PrizeClaimed':
  const gameId = prizeClaimedData.gameId?.toString();
  const player = prizeClaimedData.player;
  const amount = prizeClaimedData.amount?.toString();
  
  // Update SpacetimeDB
  await spacetimeClient.updatePrizeClaimed(
    gameId,
    player,
    amount
  );
  
  // Log for monitoring
  logger.info('Prize claim processed:', {
    gameId,
    player,
    amount,
  });
  break;
```

### Process Game Creation

When a `GameCreated` event is received:

```typescript
case 'GameCreated':
  const gameId = gameCreatedData.gameId?.toString();
  const startTime = gameCreatedData.startTime?.toString();
  const endTime = gameCreatedData.endTime?.toString();
  
  // Create game session in SpacetimeDB
  await spacetimeClient.createGameSession({
    gameId,
    startTime: parseInt(startTime),
    endTime: parseInt(endTime),
    status: 'active',
  });
  break;
```

---

## Troubleshooting

### Webhook Not Receiving Events

1. **Verify Subscription**:
   - Check subscription is enabled in CDP dashboard
   - Verify contract address matches exactly
   - Check event name is correct

2. **Verify URL**:
   - Ensure URL is `https://beatme.creativeplatform.xyz/api/webhook`
   - Must be HTTPS (not HTTP)
   - Must be publicly accessible

3. **Check Logs**:
   - View Vercel logs for webhook requests
   - Check for signature verification errors
   - Look for parsing errors

### Signature Verification Fails

1. **Verify Secret**:
   - Ensure `WEBHOOK_SECRET` matches `metadata.secret` from subscription
   - Check for typos or extra whitespace
   - Verify environment variable is set in Vercel

2. **Check Header**:
   - Ensure `X-Webhook-Signature` header is present
   - Verify header name is correct (case-sensitive)

3. **Test Locally**:
   - Use ngrok to test webhook locally
   - Check signature generation matches CDP format

### Events Not Processing

1. **Check Event Handler**:
   - Verify event name matches handler cases
   - Check contract address filter
   - Review event data structure

2. **Check Logs**:
   - Look for unhandled event types
   - Check for processing errors
   - Verify database connection

---

## Production Checklist

- [ ] CDP API key created and secured
- [ ] Webhook subscription created in CDP dashboard
- [ ] Webhook URL configured: `https://beatme.creativeplatform.xyz/api/webhook`
- [ ] Contract address filter: `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`
- [ ] Event types selected (PrizeClaimed, PlayerEntered, etc.)
- [ ] `WEBHOOK_SECRET` set in Vercel (from subscription metadata.secret)
- [ ] `WEBHOOK_PROVIDER=cdp` set in Vercel
- [ ] Health check endpoint tested
- [ ] Test webhook event received and processed
- [ ] Signature verification working
- [ ] Event handlers implemented for your use case

---

## Next Steps

1. **Create Subscription**: Use CDP portal or cdpcurl to create webhook subscription
2. **Set Environment Variables**: Configure `WEBHOOK_SECRET` and `WEBHOOK_PROVIDER` in Vercel
3. **Test Webhook**: Trigger a contract event and verify webhook is received
4. **Implement Handlers**: Add custom logic to process events (database updates, notifications, etc.)
5. **Monitor**: Set up monitoring for webhook delivery and processing

---

## Resources

- **CDP Portal**: [https://portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- **API Reference**: [CDP REST API Documentation](/api-reference/v2/rest-api/onchain-data/onchain-data)
- **Discord**: [Join CDP Discord](https://discord.com/invite/cdp) for support
- **Webhook Verification**: See CDP documentation for signature verification details

---

**Status**: ✅ **Ready for CDP Onchain Webhook Integration**

Follow the steps above to configure your CDP webhook and start receiving real-time blockchain event notifications.
