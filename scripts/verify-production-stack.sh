#!/usr/bin/env bash
# Prints CRE weekly workflow contract from repo config and verifies on-chain chainlinkOracle()
# against the Base Keystone forwarder. Manual: confirm workflow Active in Chainlink CRE dashboard.
set -euo pipefail
export PATH="${PATH:+$PATH:}${HOME}/.foundry/bin"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/chainlink-cre-workflows/weekly-prize-distribution/config.production.json"
KEYSTONE="0xF8344CFd5c43616a4366C34E3EEE75af79a74482"
RPC="${BASE_RPC_URL:-${NEXT_PUBLIC_BASE_RPC_URL:-https://mainnet.base.org}}"

if ! command -v jq >/dev/null 2>&1; then
  echo "Install jq to parse config (brew install jq)."
  exit 1
fi

CONTRACT="$(jq -r '.evms[0].contractAddress' "$CONFIG")"
echo "CRE weekly-prize-distribution config.production.json contract: $CONTRACT"
echo "Expected Keystone forwarder (Base): $KEYSTONE"
echo "RPC: $RPC"
echo ""

if command -v cast >/dev/null 2>&1; then
  ORACLE="$(cast call "$CONTRACT" "chainlinkOracle()(address)" --rpc-url "$RPC" 2>/dev/null || true)"
  if [[ -z "${ORACLE:-}" ]]; then
    echo "cast call failed; install foundry (cast) or set BASE_RPC_URL."
    exit 0
  fi
  echo "On-chain chainlinkOracle(): $ORACLE"
  OLC="$(echo "$ORACLE" | tr '[:upper:]' '[:lower:]')"
  KLC="$(echo "$KEYSTONE" | tr '[:upper:]' '[:lower:]')"
  if [[ "$OLC" == "$KLC" ]]; then
    echo "OK: oracle matches Keystone forwarder."
  else
    echo "WARN: oracle does not match Keystone forwarder — CRE reports may not authorize."
  fi
else
  echo "cast not found; skipping on-chain check. Install foundry: https://book.getfoundry.sh"
fi

echo ""
echo "Manual: https://app.chain.link/cre — confirm deployment uses the same contract and workflow is Active."
