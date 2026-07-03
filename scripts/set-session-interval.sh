#!/usr/bin/env bash
# Set TriviaBattle sessionInterval to 7 days (604800 seconds) on Base mainnet.
# Requires: cast, PRIVATE_KEY env (contract owner), optional BASE_RPC_URL.
set -euo pipefail

CONTRACT="${TRIVIA_CONTRACT:-0x9b33f82357CC0a263A533599633fB0AA5CFD907c}"
RPC="${BASE_RPC_URL:-https://mainnet.base.org}"
INTERVAL="${SESSION_INTERVAL_SEC:-604800}"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "Error: set PRIVATE_KEY (contract owner) before running." >&2
  exit 1
fi

echo "Contract: $CONTRACT"
echo "RPC: $RPC"
echo "Current sessionInterval:"
cast call "$CONTRACT" "sessionInterval()(uint256)" --rpc-url "$RPC"

echo "Sending setSessionInterval($INTERVAL)..."
cast send "$CONTRACT" \
  "setSessionInterval(uint256)" "$INTERVAL" \
  --rpc-url "$RPC" \
  --private-key "$PRIVATE_KEY"

echo "Updated sessionInterval:"
cast call "$CONTRACT" "sessionInterval()(uint256)" --rpc-url "$RPC"
