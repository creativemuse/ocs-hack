#!/bin/bash
# Create CDP webhook subscription and extract the secret
# Usage: ./scripts/create-cdp-webhook.sh

set -e

API_KEY_ID="${CDP_API_KEY_ID:-24e05772-f018-4226-88c3-12ac7cfbf15f}"
API_KEY_SECRET="${CDP_API_KEY_SECRET:-fYfenam/ZGviGflr+TkG3BIZ6YddCO3K89HpWUaQRNN1FjZyqOor5Pk245jyt2h0iVzVHwZ7p+68sKEU3GKFgQ==}"
WEBHOOK_URL="${WEBHOOK_URL:-https://webhook.site/84517274-2eec-4d83-b59d-c30faacf4b1a}"

echo "Creating CDP webhook subscription..."
echo "Webhook URL: $WEBHOOK_URL"
echo ""

RESPONSE=$(cdpcurl -X POST \
  -i "$API_KEY_ID" \
  -s "$API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions" \
  -d "{
    \"description\": \"TriviaBattlev4 Test - PrizeClaimed Events\",
    \"eventTypes\": [\"onchain.activity.detected\"],
    \"target\": {
      \"url\": \"$WEBHOOK_URL\",
      \"method\": \"POST\"
    },
    \"labels\": {
      \"contract_address\": \"0xd8F082fa4EF6a4C59F8366c19a196d488485682b\",
      \"event_name\": \"PrizeClaimed\",
      \"network\": \"base-mainnet\"
    },
    \"isEnabled\": true
  }" 2>/dev/null)

# Extract JSON (skip HTTP status line)
JSON=$(echo "$RESPONSE" | tail -n +2)

echo "Full Response:"
echo "$JSON" | jq '.'
echo ""
echo "=========================================="
echo "⚠️  WEBHOOK SECRET (copy this immediately!):"
echo "=========================================="
SECRET=$(echo "$JSON" | jq -r '.metadata.secret // empty')
if [ -z "$SECRET" ]; then
  echo "ERROR: Secret not found in response!"
  exit 1
fi
echo "$SECRET"
echo ""
echo "=========================================="
echo "Set this as WEBHOOK_SECRET in Vercel:"
echo "WEBHOOK_SECRET=$SECRET"
echo "WEBHOOK_PROVIDER=cdp"
echo "=========================================="

