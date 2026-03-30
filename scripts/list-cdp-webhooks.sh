#!/bin/bash
# List all CDP webhook subscriptions
# Usage: ./scripts/list-cdp-webhooks.sh

set -e

API_KEY_ID="${CDP_API_KEY_ID:-24e05772-f018-4226-88c3-12ac7cfbf15f}"
API_KEY_SECRET="${CDP_API_KEY_SECRET:-fYfenam/ZGviGflr+TkG3BIZ6YddCO3K89HpWUaQRNN1FjZyqOor5Pk245jyt2h0iVzVHwZ7p+68sKEU3GKFgQ==}"

echo "Fetching all webhook subscriptions..."
echo ""

RESPONSE=$(cdpcurl -X GET \
  -i "$API_KEY_ID" \
  -s "$API_KEY_SECRET" \
  "https://api.cdp.coinbase.com/platform/v2/data/webhooks/subscriptions" 2>/dev/null)

# Extract JSON (skip HTTP status line)
JSON=$(echo "$RESPONSE" | tail -n +2)

echo "$JSON" | jq '.'

echo ""
echo "=========================================="
echo "Webhook Secrets:"
echo "=========================================="
echo "$JSON" | jq -r '.subscriptions[]? | "\(.description // "N/A"): \(.metadata.secret // "NOT FOUND")"'
echo ""
echo "If no subscriptions found, create one with:"
echo "  ./scripts/create-cdp-webhook.sh"

