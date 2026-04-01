#!/usr/bin/env bash
# Deploy contracts/TriviaBattle.sol to Base mainnet via Foundry.
# Prerequisites: forge, PRIVATE_KEY in env, ETHERSCAN_API_KEY for --verify (Etherscan API v2, all L2s)
#
# Usage:
#   export PRIVATE_KEY=0x...
#   export BASE_MAINNET_RPC_URL=https://mainnet.base.org   # optional
#   export ETHERSCAN_API_KEY=...                             # for verification (v2 key)
#   ./scripts/deploy-trivia-battle-base.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "Error: set PRIVATE_KEY to your deployer wallet (with Base ETH for gas)." >&2
  exit 1
fi

RPC="${BASE_MAINNET_RPC_URL:-${BASE_RPC_URL:-https://mainnet.base.org}}"

echo "Deploying TriviaBattle (chainlinkOracle = Base Keystone forwarder in script)..."
forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url "$RPC" \
  --broadcast \
  ${ETHERSCAN_API_KEY:+--verify}

echo ""
echo "Next steps:"
echo "  1. Copy the deployed address from the output above."
echo "  2. Set NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS and redeploy Vercel (or update .env.local)."
echo "  3. Update chainlink-cre-workflows/weekly-prize-distribution/config.production.json contractAddress."
echo "  4. From chainlink-cre-workflows: cre workflow deploy weekly-prize-distribution --target production-settings --yes"
echo "See docs/DEPLOY_TRIVIA_BATTLE_BASE.md"
