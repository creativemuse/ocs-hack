# CDP Webhook Troubleshooting Guide

**Status**: ✅ **TROUBLESHOOTING GUIDE**

Common issues and solutions for CDP Onchain Webhook setup.

---

## Issue: Invalid Subscription ID Format

### Error
```
400 Bad Request
Invalid format for parameter subscriptionId: error unmarshaling '690a1642756d790d3e28532b' text as *uuid.UUID: invalid UUID length: 24
```

### Solution

The subscription ID format might be different. Try these approaches:

#### Option 1: List All Subscriptions

Get all subscriptions to see the correct format:

```bash
cdpcurl -X GET \
  -i "24e05772-f018-4226-88c3-12ac7cfbf15f" \
  -s "fYfenam/ZGviGflr+TkG3BIZ6YddCO3K89HpWUaQRNN1FjZyqOor5Pk245jyt2h0iVzVHwZ7p+68sKEU3GKFgQ==" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions"
```

This will return all subscriptions with their IDs and metadata including the secret.

#### Option 2: Use CDP Portal

1. Go to [CDP Portal](https://portal.cdp.coinbase.com)
2. Navigate to **Webhooks** section
3. Find your subscription
4. The secret should be visible in the subscription details

#### Option 3: Check Subscription Response

When you created the subscription, the response should have included:
- `subscriptionId` - The subscription identifier
- `metadata.secret` - The webhook secret (this is what you need!)

Save the `metadata.secret` immediately when creating the subscription.

---

## Issue: Cannot Find Webhook Secret

### Solution 1: Check Subscription Creation Response

If you just created the subscription, the secret is in the response:

```json
{
  "subscriptionId": "...",
  "metadata": {
    "secret": "whsec_xxxxxxxxxxxx"  // ← Copy this immediately
  }
}
```

### Solution 2: Create New Subscription

If you lost the secret, you may need to create a new subscription:

1. Delete the old subscription (if needed)
2. Create a new one
3. **Copy the `metadata.secret` immediately** - it's only shown once!

### Solution 3: Check CDP Portal

1. Log into [CDP Portal](https://portal.cdp.coinbase.com)
2. Go to **Webhooks** → **Your Subscription**
3. The secret should be visible in the subscription details

---

## Issue: Webhook Not Receiving Events

### Checklist

1. **Subscription Status**:
   - ✅ Subscription is enabled (`isEnabled: true`)
   - ✅ Check subscription in CDP Portal

2. **Contract Address**:
   - ✅ Must match exactly: `0xd8F082fa4EF6a4C59F8366c19a196d488485682b`
   - ✅ Case-sensitive
   - ✅ Include `0x` prefix

3. **Event Name**:
   - ✅ Matches contract event exactly (e.g., `PrizeClaimed` not `prizeClaimed`)
   - ✅ Check contract ABI for exact event names

4. **Network**:
   - ✅ Network filter matches: `base-mainnet` (or `base-sepolia` for testnet)

5. **Webhook URL**:
   - ✅ URL is accessible (HTTPS required)
   - ✅ URL is correct (no typos)
   - ✅ For testing: `https://webhook.site/84517274-2eec-4d83-b59d-c30faacf4b1a`
   - ✅ For production: `https://beatme.creativeplatform.xyz/api/webhook`

---

## Issue: Signature Verification Fails

### Error
```
401 Unauthorized
Invalid webhook signature
```

### Solutions

1. **Verify Secret**:
   - Ensure `WEBHOOK_SECRET` matches `metadata.secret` from subscription
   - No extra whitespace or quotes
   - Case-sensitive

2. **Check Header**:
   - CDP uses `X-Hook0-Signature` (not `X-Webhook-Signature`)
   - Format: `t=timestamp,h=headerNames,v1=signature`

3. **Check Timestamp**:
   - Webhooks older than 5 minutes are rejected (replay protection)
   - Ensure server time is synchronized

4. **Raw Body**:
   - Next.js automatically preserves raw body
   - Signature is computed against raw bytes, not parsed JSON

---

## Issue: API Authentication Errors

### Error
```
401 Unauthorized
Invalid API key
```

### Solutions

1. **Verify API Key**:
   - Check API Key ID and Secret are correct
   - No extra whitespace
   - API key must be a Secret API Key (not regular API key)

2. **Check API Key Status**:
   - Ensure API key is active
   - Check in CDP Portal → API Keys

3. **Regenerate if Needed**:
   - If key is compromised, create a new one
   - Update all scripts/configurations

---

## Getting Subscription Details

### Method 1: List All Subscriptions

```bash
cdpcurl -X GET \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions"
```

This returns all subscriptions with their details including secrets.

### Method 2: Use CDP Portal

1. Go to [CDP Portal](https://portal.cdp.coinbase.com)
2. Navigate to **Webhooks**
3. Click on your subscription
4. View details including secret

### Method 3: Check Creation Response

If you have the original subscription creation response, the secret is in:
```json
{
  "metadata": {
    "secret": "whsec_..."
  }
}
```

---

## Common Subscription ID Formats

CDP might use different ID formats:
- UUID format: `24e05772-f018-4226-88c3-12ac7cfbf15f`
- Short format: `690a1642756d790d3e28532b` (24 characters)
- Long format: Various lengths

**Solution**: Use the list endpoint to see all subscriptions and their IDs.

---

## Quick Reference

### Get All Subscriptions (Recommended)
```bash
cdpcurl -X GET \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions"
```

### Create New Subscription
```bash
cdpcurl -X POST \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions" \
  -d '{
    "description": "Test Subscription",
    "eventTypes": ["onchain.activity.detected"],
    "target": {
      "url": "https://webhook.site/84517274-2eec-4d83-b59d-c30faacf4b1a"
    },
    "labels": {
      "contract_address": "0xd8F082fa4EF6a4C59F8366c19a196d488485682b",
      "event_name": "PrizeClaimed"
    },
    "isEnabled": true
  }'
```

**⚠️ IMPORTANT**: Copy the `metadata.secret` from the response immediately!

---

## Need Help?

- **CDP Portal**: [https://portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- **CDP Discord**: [Join Discord](https://discord.com/invite/cdp)
- **API Documentation**: [CDP REST API Reference](/api-reference/v2/rest-api/onchain-data/onchain-data)

---

**Status**: ✅ **Troubleshooting Guide Ready**

Use these solutions to resolve common CDP webhook issues.

