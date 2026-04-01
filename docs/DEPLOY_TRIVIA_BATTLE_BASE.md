# Deploy `TriviaBattle.sol` on Base (CRE + app)

Your app and CRE workflow expect **`contracts/TriviaBattle.sol`** (session model, `onReport`, `setChainlinkOracle`, etc.). A contract with only `(_usdcToken, _platformFeeRecipient)` in the constructor is a **different** build and will not work with `set-chainlink-oracle.sh` or the weekly CRE workflow as written.

## What was fixed in-repo

- `script/DeployTriviaBattle.s.sol` sets **Base mainnet** `chainlinkOracle` to the **Keystone forwarder** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` at deploy time (no separate `setChainlinkOracle` tx needed for new deploys).
- Repo defaults target **`TriviaBattle.sol`** on Base mainnet at `0xfF52Ed1DEb46C197aD7fce9DEC93ff9e987f8dB6` (update `.env.local` / Vercel when you deploy again).

## Deploy a fresh contract (optional)

```bash
export PRIVATE_KEY=0x...          # deployer with Base ETH
export ETHERSCAN_API_KEY=...      # Etherscan API v2 key (works for Base / all supported L2s)
./scripts/deploy-trivia-battle-base.sh
```

Then:

1. Set `NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS` to the **new** address everywhere (local + Vercel). Run `vercel env pull` after updating in the dashboard, or `vercel env add NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS production` so production matches [chainlink-cre-workflows/weekly-prize-distribution/config.production.json](../chainlink-cre-workflows/weekly-prize-distribution/config.production.json).
2. Update `chainlink-cre-workflows/weekly-prize-distribution/config.production.json` → `contractAddress`.
3. From `chainlink-cre-workflows/`: put `CRE_ETH_PRIVATE_KEY` in **`chainlink-cre-workflows/.env`**, or pass **`-e weekly-prize-distribution/.env`** if the key only lives under the workflow folder (see `chainlink-cre-workflows/ENV_SETUP.md`).

   `cre workflow deploy weekly-prize-distribution -e weekly-prize-distribution/.env --target production-settings --yes`

4. Activate (workflow folder is required; same `-e` if needed):

   `cre workflow activate weekly-prize-distribution -e weekly-prize-distribution/.env --target production-settings --yes`

## Verify on BaseScan

Read contract → **Read contract**: `chainlinkOracle()` should equal the Keystone forwarder after deploy.
