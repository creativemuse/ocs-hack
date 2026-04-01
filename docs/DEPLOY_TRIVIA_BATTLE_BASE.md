# Deploy `TriviaBattle.sol` on Base (CRE + app)

Your app and CRE workflow expect **`contracts/TriviaBattle.sol`** (session model, `onReport`, `setChainlinkOracle`, etc.). A contract with only `(_usdcToken, _platformFeeRecipient)` in the constructor is a **different** build and will not work with `set-chainlink-oracle.sh` or the weekly CRE workflow as written.

## What was fixed in-repo

- `script/DeployTriviaBattle.s.sol` sets **Base mainnet** `chainlinkOracle` to the **Keystone forwarder** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` at deploy time (no separate `setChainlinkOracle` tx needed for new deploys).
- `.env.local` and `chainlink-cre-workflows/weekly-prize-distribution/config.production.json` point at the known-good **`TriviaBattle.sol`** deployment `0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f` (replacing the mismatched address).

## Deploy a fresh contract (optional)

```bash
export PRIVATE_KEY=0x...          # deployer with Base ETH
export BASESCAN_API_KEY=...       # for contract verification
./scripts/deploy-trivia-battle-base.sh
```

Then:

1. Set `NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS` to the **new** address everywhere (local + Vercel).
2. Update `chainlink-cre-workflows/weekly-prize-distribution/config.production.json` → `contractAddress`.
3. From `chainlink-cre-workflows/`: `cre workflow deploy weekly-prize-distribution --target production-settings --yes`

## Verify on BaseScan

Read contract → **Read contract**: `chainlinkOracle()` should equal the Keystone forwarder after deploy.
