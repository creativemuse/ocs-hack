#!/usr/bin/env bash
# Set TriviaBattle.chainlinkOracle to the Base Keystone forwarder (CRE writeReport caller).
# Requires: cast (Foundry), CONTRACT_OWNER_PRIVATE_KEY, and a working Base RPC.
#
# Base KeystoneForwarder (verify in docs / CRE dashboard if this changes):
#   0xF8344CFd5c43616a4366C34E3EEE75af79a74482
#
# Usage:
#   export CONTRACT_OWNER_PRIVATE_KEY=0x...
#   export TRIVIA_CONTRACT_ADDRESS=0xfF52Ed1DEb46C197aD7fce9DEC93ff9e987f8dB6
#   export BASE_RPC_URL=https://mainnet.base.org
#   ./scripts/set-chainlink-oracle.sh

set -euo pipefail

CONTRACT="${TRIVIA_CONTRACT_ADDRESS:?Set TRIVIA_CONTRACT_ADDRESS}"
RPC_URL="${BASE_RPC_URL:-https://mainnet.base.org}"
FORWARDER="${CHAINLINK_KEYSTONE_FORWARDER:-0xF8344CFd5c43616a4366C34E3EEE75af79a74482}"
PK="${CONTRACT_OWNER_PRIVATE_KEY:-${PRIVATE_KEY:-}}"

if [[ -z "${PK}" ]]; then
  echo "Error: set CONTRACT_OWNER_PRIVATE_KEY (or PRIVATE_KEY) to the contract owner key." >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "Error: cast (Foundry) not found in PATH." >&2
  exit 1
fi

# Selector for setChainlinkOracle(address) — must exist in deployed bytecode (see TriviaBattle.sol).
SET_ORACLE_SELECTOR="7a9b0412"
BYTECODE=$(cast code "${CONTRACT}" --rpc-url "${RPC_URL}" 2>/dev/null | tr -d '\n')
if [[ "${BYTECODE}" != *"${SET_ORACLE_SELECTOR}"* ]]; then
  echo "Error: deployed bytecode at ${CONTRACT} does not contain setChainlinkOracle (0x${SET_ORACLE_SELECTOR})." >&2
  echo "       This address is not the expected TriviaBattle build, or CRE fields were removed." >&2
  echo "       Fix: redeploy contracts/TriviaBattle.sol with the full constructor, and pass the Keystone" >&2
  echo "       forwarder as _chainlinkOracle, or deploy an artifact that includes setChainlinkOracle." >&2
  echo "       Verify the contract on BaseScan and compare ABI to your repo." >&2
  exit 1
fi

SIGNER=$(cast wallet address --private-key "${PK}")
ONCHAIN_OWNER=$(cast call "${CONTRACT}" "owner()(address)" --rpc-url "${RPC_URL}")
SIGNER_LC=$(echo "${SIGNER}" | tr '[:upper:]' '[:lower:]')
OWNER_LC=$(echo "${ONCHAIN_OWNER}" | tr '[:upper:]' '[:lower:]')
if [[ "${SIGNER_LC}" != "${OWNER_LC}" ]]; then
  echo "Error: signer ${SIGNER} is not contract owner ${ONCHAIN_OWNER}." >&2
  echo "       Use the private key for the wallet that owns this contract." >&2
  exit 1
fi

echo "Setting chainlinkOracle on ${CONTRACT} -> ${FORWARDER}"
cast send "${CONTRACT}" "setChainlinkOracle(address)" "${FORWARDER}" \
  --rpc-url "${RPC_URL}" \
  --private-key "${PK}"

echo "Verifying chainlinkOracle()"
cast call "${CONTRACT}" "chainlinkOracle()" --rpc-url "${RPC_URL}"

echo "Done."
