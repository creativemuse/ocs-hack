# CDP Webhook Testing Guide

**Status**: ✅ **TESTING SETUP**

This guide helps you test CDP Onchain Webhooks using webhook.site before deploying to production.

---

## Test URL

**Webhook.site URL**: `https://webhook.site/84517274-2eec-4d83-b59d-c30faacf4b1a`

This is a temporary URL for testing webhook payloads. You can view all incoming webhook requests in real-time at this URL.

---

## Setup Steps

### 1. Create CDP Webhook Subscription

Use the webhook.site URL for testing:

```bash
cdpcurl -X POST \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions" \
  -d '{
    "description": "TriviaBattlev4 Test - PrizeClaimed Events",
    "eventTypes": [
      "onchain.activity.detected"
    ],
    "target": {
      "url": "https://webhook.site/84517274-2eec-4d83-b59d-c30faacf4b1a",
      "method": "POST"
    },
    "labels": {
      "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
      "event_name": "PrizeClaimed",
      "network": "base-mainnet"
    },
    "isEnabled": true
  }'
```

**Important**: Save the `metadata.secret` from the response - you'll need it for production.

---

## What to Look For

When you visit `https://webhook.site/84517274-2eec-4d83-b59d-c30faacf4b1a`, you'll see:

### Request Headers

Look for:
- `X-Hook0-Signature`: Signature header for verification
  - Format: `t=timestamp,h=headerNames,v1=signature`
- `X-Hook0-Id`: Event ID
- `Content-Type`: `application/json`

### Request Body

Example payload structure:

```json
{
  "id": "evt_1a2b3c4d5e6f",
  "type": "onchain.activity.detected",
  "createdAt": "2025-01-01T00:00:00Z",
  "data": {
    "subscriptionId": "sub_abc123",
    "networkId": "base-mainnet",
    "blockNumber": 12345678,
    "blockHash": "0x...",
    "transactionHash": "0x...",
    "logIndex": 42,
    "contractAddress": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "eventName": "PrizeClaimed",
    "gameId": "1",
    "player": "0x1234...",
    "amount": "500000",
    "ranking": "1"
  }
}
```

---

## Testing Checklist

### ✅ Verify Webhook is Receiving Events

1. **Trigger a Contract Event**:
   - Claim a prize on your contract
   - Or trigger any event you're monitoring
   - Wait a few seconds for the webhook to arrive

2. **Check webhook.site**:
   - Visit your webhook.site URL
   - You should see a new request appear
   - Click on it to view details

3. **Verify Payload**:
   - ✅ `type` is `"onchain.activity.detected"`
   - ✅ `data.contractAddress` matches your contract
   - ✅ `data.eventName` matches the event you triggered
   - ✅ `data.transactionHash` is present
   - ✅ Event-specific fields are present (gameId, player, amount, etc.)

### ✅ Verify Signature Header

1. **Check Headers**:
   - Look for `X-Hook0-Signature` header
   - Format should be: `t=timestamp,h=headerNames,v1=signature`

2. **Verify Signature** (optional):
   - Copy the raw body from webhook.site
   - Copy the signature header
   - Use the verification function to test locally

---

## Testing Multiple Events

To test multiple event types, create separate subscriptions for each:

### Subscription 1: PrizeClaimed
```json
{
  "labels": {
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_name": "PrizeClaimed"
  }
}
```

### Subscription 2: PlayerEntered
```json
{
  "labels": {
    "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
    "event_name": "PlayerEntered"
  }
}
```

Or create one subscription monitoring all events (remove `event_name` filter).

---

## Switching to Production

Once testing is complete:

1. **Create Production Subscription**:
   - Use URL: `https://beatme.creativeplatform.xyz/api/webhook`
   - Same contract address and event filters
   - Copy the new `metadata.secret`

2. **Update Environment Variables**:
   ```bash
   WEBHOOK_SECRET=<new_secret_from_production_subscription>
   WEBHOOK_PROVIDER=cdp
   ```

3. **Delete Test Subscription**:
   ```bash
   cdpcurl -X DELETE \
     -i "YOUR_API_KEY_ID" \
     -s "YOUR_API_KEY_SECRET" \
     "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions/<TEST_SUBSCRIPTION_ID>"
   ```

---

## Troubleshooting

### No Webhooks Received

1. **Check Subscription Status**:
   - Verify subscription is enabled in CDP dashboard
   - Check subscription filters match your contract

2. **Verify Contract Address**:
   - Must match exactly: `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`
   - Case-sensitive

3. **Check Event Name**:
   - Verify event name matches exactly (e.g., `PrizeClaimed` not `prizeClaimed`)
   - Check contract ABI for exact event names

4. **Network**:
   - Ensure network is `base-mainnet` (or `base-sepolia` if testing)

### Webhook Received but Wrong Data

1. **Check Contract Address Filter**:
   - Verify filter matches the contract that emitted the event

2. **Check Event Name**:
   - Verify the event name filter matches the actual event

3. **Check Network**:
   - Ensure network filter matches where the contract is deployed

---

## Example Test Flow

1. **Create Subscription** with webhook.site URL
2. **Trigger Event**:
   - Claim a prize on your contract
   - Or have a player join a game
3. **Check webhook.site**:
   - Should see request within seconds
4. **Verify Payload**:
   - Check all fields are present
   - Verify contract address matches
   - Verify event data is correct
5. **Switch to Production**:
   - Create new subscription with production URL
   - Update environment variables
   - Delete test subscription

---

## Production URL

Once testing is complete, use:

**Production Webhook URL**: `https://beatme.creativeplatform.xyz/api/webhook`

**Test Webhook URL**: `https://webhook.site/84517274-2eec-4d83-b59d-c30faacf4b1a` (temporary)

---

**Status**: ✅ **Ready for Testing**

Use webhook.site to verify webhook payloads before switching to production URL.

