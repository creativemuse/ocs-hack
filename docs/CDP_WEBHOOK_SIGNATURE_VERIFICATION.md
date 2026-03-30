# CDP Onchain Webhook Signature Verification

**Status**: ✅ **IMPLEMENTED - PRODUCTION READY**

This document explains how CDP Onchain Webhook signature verification works in our implementation.

---

## Overview

CDP Onchain Webhooks use the `X-Hook0-Signature` header for authentication. The signature includes:
- **Timestamp**: Unix timestamp when webhook was sent (prevents replay attacks)
- **Header Names**: Space-separated list of headers included in signature
- **Signature**: HMAC SHA-256 signature of the signed payload

---

## Signature Header Format

CDP sends signatures in this format:

```
X-Hook0-Signature: t=1728394718,h=content-type x-hook0-id,v1=a1b2c3d4e5f6...
```

**Components**:
- `t=1728394718` - Unix timestamp
- `h=content-type x-hook0-id` - Header names included in signature
- `v1=a1b2c3d4e5f6...` - HMAC SHA-256 signature (hex)

---

## Verification Process

### Step 1: Extract Signature Components

```typescript
const elements = signatureHeader.split(',');
const timestamp = elements.find(e => e.startsWith('t=')).split('=')[1];
const headerNames = elements.find(e => e.startsWith('h=')).split('=')[1];
const providedSignature = elements.find(e => e.startsWith('v1=')).split('=')[1];
```

### Step 2: Verify Timestamp (Replay Attack Prevention)

```typescript
const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
const currentTime = Date.now();
const ageMinutes = (currentTime - webhookTime) / (1000 * 60);

if (ageMinutes > 5) {
  // Webhook is too old - reject to prevent replay attacks
  return false;
}
```

**Default Window**: 5 minutes (configurable)

### Step 3: Build Header Values String

```typescript
const headerNameList = headerNames.split(' ');
const headerValues = headerNameList
  .map(name => headers.get(name.toLowerCase()) || headers.get(name) || '')
  .join('.');
```

### Step 4: Build Signed Payload

```typescript
const signedPayload = `${timestamp}.${headerNames}.${headerValues}.${payload}`;
```

**Format**: `timestamp.headerNames.headerValues.rawBody`

### Step 5: Compute Expected Signature

```typescript
const expectedSignature = crypto
  .createHmac('sha256', secret) // secret from metadata.secret
  .update(signedPayload, 'utf8')
  .digest('hex');
```

### Step 6: Compare Signatures (Timing-Safe)

```typescript
const signaturesMatch = crypto.timingSafeEqual(
  Buffer.from(expectedSignature, 'hex'),
  Buffer.from(providedSignature, 'hex')
);
```

---

## Implementation

The verification is implemented in `app/api/webhook/route.ts`:

```typescript
function verifyCDPWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  headers: Headers,
  maxAgeMinutes: number = 5
): boolean
```

**Features**:
- ✅ Timestamp verification (5-minute window)
- ✅ Header extraction and validation
- ✅ Signed payload construction
- ✅ HMAC SHA-256 signature computation
- ✅ Timing-safe signature comparison
- ✅ Comprehensive error handling

---

## Security Features

### Replay Attack Prevention

The timestamp verification ensures webhooks older than 5 minutes are rejected:

```typescript
if (ageMinutes > maxAgeMinutes) {
  logger.warn(`CDP webhook timestamp exceeds maximum age: ${ageMinutes.toFixed(1)} minutes`);
  return false;
}
```

### Timing Attack Prevention

Uses `crypto.timingSafeEqual()` for signature comparison:

```typescript
crypto.timingSafeEqual(
  Buffer.from(expectedSignature, 'hex'),
  Buffer.from(providedSignature, 'hex')
);
```

This prevents attackers from using timing differences to guess the secret.

---

## Configuration

### Environment Variables

```bash
# Webhook secret from CDP subscription metadata.secret
WEBHOOK_SECRET=<secret_from_subscription_response>

# Set provider to CDP
WEBHOOK_PROVIDER=cdp
```

### Getting the Secret

1. Create webhook subscription in CDP Portal
2. Copy `metadata.secret` from the subscription response
3. Set as `WEBHOOK_SECRET` in Vercel environment variables

---

## Example Verification Flow

### 1. Webhook Request Received

```
POST /api/webhook
Headers:
  X-Hook0-Signature: t=1728394718,h=content-type x-hook0-id,v1=a1b2c3d4...
  X-Hook0-Id: evt_1a2b3c4d5e6f
  Content-Type: application/json
Body: {"id":"evt_1a2b3c4d5e6f","type":"onchain.activity.detected",...}
```

### 2. Extract Components

```typescript
timestamp = "1728394718"
headerNames = "content-type x-hook0-id"
providedSignature = "a1b2c3d4..."
```

### 3. Build Header Values

```typescript
headerValues = "application/json.evt_1a2b3c4d5e6f"
// (content-type value + x-hook0-id value, joined with '.')
```

### 4. Build Signed Payload

```typescript
signedPayload = "1728394718.content-type x-hook0-id.application/json.evt_1a2b3c4d5e6f.{\"id\":\"evt_1a2b3c4d5e6f\",...}"
```

### 5. Compute Expected Signature

```typescript
expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(signedPayload, 'utf8')
  .digest('hex');
```

### 6. Compare

```typescript
if (expectedSignature === providedSignature) {
  // ✅ Webhook is authentic
  return true;
} else {
  // ❌ Invalid signature
  return false;
}
```

---

## Troubleshooting

### Signature Verification Fails

**Check 1: Secret Matches**
- Ensure `WEBHOOK_SECRET` exactly matches `metadata.secret` from subscription
- No extra whitespace or quotes
- Case-sensitive

**Check 2: Header Format**
- Ensure `X-Hook0-Signature` header is present (not `X-Webhook-Signature`)
- Format must be: `t=timestamp,h=headers,v1=signature`

**Check 3: Timestamp**
- Check if webhook is older than 5 minutes
- Adjust `maxAgeMinutes` if needed (default: 5)

**Check 4: Raw Body**
- Next.js automatically preserves raw body for signature verification
- Ensure body is not parsed before verification

**Check 5: Header Names**
- Verify header names in signature match actual request headers
- Headers are case-insensitive in Next.js

---

## Testing

### Test with cdpcurl

```bash
# Create subscription first to get secret
cdpcurl -X POST \
  -i "YOUR_API_KEY_ID" \
  -s "YOUR_API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions" \
  -d '{"description":"Test","eventTypes":["onchain.activity.detected"],"target":{"url":"https://your-domain.com/api/webhook"},"labels":{"contract_address":"0xd8F082fa4EF6a4C59F8366c19a196d488485682b","event_name":"PrizeClaimed"},"isEnabled":true}'
```

### Verify Locally

1. Set `WEBHOOK_SECRET` in `.env.local`
2. Set `WEBHOOK_PROVIDER=cdp`
3. Use ngrok to expose local server
4. Update CDP subscription to use ngrok URL
5. Trigger contract event
6. Check logs for verification status

---

## Production Checklist

- [ ] `WEBHOOK_SECRET` set in Vercel (from subscription metadata.secret)
- [ ] `WEBHOOK_PROVIDER=cdp` set in Vercel
- [ ] Webhook URL configured: `https://beatme.creativeplatform.xyz/api/webhook`
- [ ] Signature verification tested
- [ ] Timestamp verification working (5-minute window)
- [ ] Error logging configured
- [ ] Monitoring set up for verification failures

---

## Security Best Practices

1. **Never log secrets**: Only log verification status, not the secret
2. **Use HTTPS**: Always use HTTPS for webhook URLs
3. **Monitor failures**: Track signature verification failures for security alerts
4. **Keep secrets secure**: Use environment variables, never hardcode
5. **Verify timestamp**: Always verify timestamp to prevent replay attacks

---

**Status**: ✅ **Production Ready**

The CDP webhook signature verification is fully implemented and ready for production use.

