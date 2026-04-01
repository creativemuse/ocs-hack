# CRE: deploy & on-chain steps (weekly-prize-distribution)

After updating `config.production.json`, run everything from the **`chainlink-cre-workflows`** directory (parent of this folder).

**Repo default:** `config.production.json` uses the Base mainnet `TriviaBattle.sol` deployment `0x2E48c2aae9CC1dF9Ca4e5Cd67be17f299B86eB4f` (matches `lib/blockchain/contracts.ts`). Replace this when you deploy a new contract; see `docs/DEPLOY_TRIVIA_BATTLE_BASE.md`.

## 1. RPC for `project.yaml`

The CRE CLI uses `chainlink-cre-workflows/project.yaml` for **Ethereum mainnet** RPC when talking to the workflow registry. Alchemy URLs often return **403** from the CLI (“origin not on allowlist”). This repo uses a public endpoint by default; you can point `production-settings.rpcs` at any healthy mainnet RPC.

## 2. Deploy workflow

```bash
cd chainlink-cre-workflows
bun install --cwd weekly-prize-distribution

cre workflow deploy weekly-prize-distribution --target production-settings --yes
```

Successful deploy registers/updates workflow **`weekly-prize-dist-prod`** and uploads `config.production.json` (including your contract address).

## 3. Activate workflow

```bash
cre workflow activate weekly-prize-distribution --target production-settings --yes
```

If the workflow is **already active**, the CLI exits with a message and does not send a transaction (expected after redeploy in some cases).

## 4. Optional: simulate locally

```bash
cre workflow simulate weekly-prize-distribution --target production-settings --non-interactive --trigger-index 0
```

If simulation fails with **no compatible capability** for Base’s chain selector, upgrade the CLI (`cre update`) per the CLI’s hint; older simulators may not include all chain capabilities.

## 5. On-chain: `setChainlinkOracle` on TriviaBattle

CRE calls your contract via the **Keystone forwarder**. Your contract checks `msg.sender == chainlinkOracle` in `onReport`, so you must set:

- `setChainlinkOracle(<forwarder>)`

Base mainnet forwarder used with your previous deployment (verify on [CRE docs](https://docs.chain.link/cre) / dashboard if needed):

`0xF8344CFd5c43616a4366C34E3EEE75af79a74482`

From the repo root:

```bash
export CONTRACT_OWNER_PRIVATE_KEY=0x...   # contract owner
export TRIVIA_CONTRACT_ADDRESS=0x...      # your new TriviaBattle
export BASE_RPC_URL=https://mainnet.base.org
./scripts/set-chainlink-oracle.sh
```

Verify:

```bash
cast call "$TRIVIA_CONTRACT_ADDRESS" "chainlinkOracle()" --rpc-url "$BASE_RPC_URL"
```

**Before** calling `setChainlinkOracle`, confirm on BaseScan that the verified ABI includes `setChainlinkOracle`. If `cast send` fails at **gas estimation** with **execution reverted**, the usual cause is that **this function is not in the deployed bytecode** (wrong contract build or address). The helper script `scripts/set-chainlink-oracle.sh` checks for selector `0x7a9b0412` in runtime code before sending. If it fails that check, redeploy `contracts/TriviaBattle.sol` with the full constructor and pass the Keystone forwarder as `_chainlinkOracle`, or use a build that includes `setChainlinkOracle`.

## 6. Monitor

- Dashboard: [cre.chain.link](https://cre.chain.link) → workflow `weekly-prize-dist-prod`
- CLI: `cre workflow status weekly-prize-distribution --target production-settings`
