# TriviaBattle deployment summary

## Deployment successful

### Base Mainnet (production)

- **Address**: `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`
- **Network**: Base Mainnet (Chain ID: 8453)
- **Deployed**: October 13, 2025
- **Status**: Deployed and verified (functional)
- **Basescan**: https://basescan.org/address/0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13

### Base Sepolia (testnet)

- **Address**: `0x060d87018EE78c2968959cA2C8a189c12953Cc9A`
- **Transaction**: https://sepolia.basescan.org/tx/0x221329422d14e37e9225df0e1ff394d0e4f3cf19ab4fe09d404fe55695544eca
- **Owner**: `0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294`

Full Sepolia deployment notes (constructor args, env vars, extra cast checks) live in [DEPLOYMENT_SUCCESS.md](./DEPLOYMENT_SUCCESS.md).

## Post-deploy changelog

### Smart contract updates

1. Added `playerWinnings` and `hasClaimed` mappings
2. Added `claimWinnings()` function
3. Modified `distributePrizes()` to SET winnings instead of TRANSFER
4. Added `WinningsClaimed` event

### Frontend updates

1. Updated `contracts.ts` with new contract address and ABI
2. Updated `useTriviaContract` hook to call real `claimWinnings()`
3. Created `TopEarners` component for dynamic leaderboard
4. Created `useTopEarners` hook with 30-second polling
5. Replaced hardcoded leaderboard on the home page

### SpaceTimeDB updates

1. Added `PrizeHistory` table
2. Added `record_prize_distribution` reducer
3. Added `get_top_earners` reducer
4. Created `/api/top-earners` endpoint
5. Prize distribution syncs to SpaceTimeDB

## Manual steps required (mainnet — gasless claims)

### Update Coinbase Paymaster allowlist

For gasless claims to work, update the paymaster allowlist:

**Go to:** https://portal.cdp.coinbase.com/products/bundler-and-paymaster

**Project ID:** `5b09d242-5390-4db3-866f-bfc2ce575821`

**Allowlist:**

#### Contract 1: USDC token (keep)

- Address: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`
- Network: Base Mainnet
- Functions: `approve`

#### Contract 2: TriviaBattle (use current mainnet address)

- **Remove** old: `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`
- **Add** new: `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`
- Network: Base Mainnet
- Functions: `joinBattle`, `joinTrialBattle`, `submitScore`, `submitTrialScore`, **`claimWinnings`**

Wait 2–3 minutes after changes for propagation.

## Contract verification

### Base Mainnet (Basescan)

Automated verification can fail on API version issues; you can verify manually:

**Manual verification**

1. Go to: https://basescan.org/verifyContract
2. Contract: `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`
3. Compiler: Solidity 0.8.25
4. Optimization: Yes (200 runs)
5. Source: `contracts/TriviaBattle.sol`
6. Constructor args:
   - `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` (USDC)
   - `0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260` (platform fee recipient)

**Automated (optional):** update `hardhat.config.cjs` for Etherscan API v2 if you want scripted verification.

### Base Sepolia (Foundry)

1. Set `ETHERSCAN_API_KEY` in `.env`
2. Run:

```bash
forge verify-contract \
  0x060d87018EE78c2968959cA2C8a189c12953Cc9A \
  contracts/TriviaBattle.sol:TriviaBattle \
  --chain-id 84532 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,uint256,uint256,uint256)" 0x036CbD53842c5426634e7929541eC2318f3dCF7e 0xE4aB69C077896252FAFBD49EFD26B5D171A32410 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 0xf57E8952e2EC5F82376ff8Abf65f01c2401ee294 604800 1000000 80) \
  --watch
```

## How the system works now

### Prize distribution (admin)

```
Player completes game → scores submitted → session ends
  → Admin calls distributePrizes()
  → Contract sets playerWinnings[address] per winner
  → PrizesDistributed event
  → Frontend syncs to SpaceTimeDB (PayoutSystem.distributePrizes())
  → Player.total_earnings updated in SpaceTimeDB
```

### Prize claiming (player)

```
Player finishes game → HighScoreDisplay shows winnings
  → “Claim Winnings” if paid player has winnings
  → claimWinnings() (gasless on mainnet when paymaster is configured)
  → USDC to wallet → WinningsClaimed event
```

### Leaderboard

```
Prize distributed → SpaceTimeDB updated
  → Home polls /api/top-earners ~30s
  → TopEarners shows wallet, avatar, total USDC earned
```

## Testing the system

### Run the app locally

```bash
npm run dev
```

### Cast quick checks

**Base Mainnet** (`0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`):

```bash
cast call 0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13 \
  "playerWinnings(address)(uint256)" \
  <player-address> \
  --rpc-url https://mainnet.base.org

cast call 0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13 \
  "hasClaimed(address)(bool)" \
  <player-address> \
  --rpc-url https://mainnet.base.org
```

**Base Sepolia** (`0x060d87018EE78c2968959cA2C8a189c12953Cc9A`):

```bash
cast call 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "owner()" --rpc-url base_sepolia
cast call 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "USDC_TOKEN()" --rpc-url base_sepolia
cast call 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "entryFee()" --rpc-url base_sepolia
cast call 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "isSessionActive()" --rpc-url base_sepolia
cast call 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "getCurrentPlayers()" --rpc-url base_sepolia
```

## Next steps

1. **Mainnet — paymaster**  
   Update CDP allowlist: remove `0x231240B1d776a8F72785FE3707b74Ed9C3048B3a`, add `0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13`, include `claimWinnings`.

2. **App config**  
   Point `lib/blockchain/contracts.ts` at the address for the network you are testing (Sepolia vs mainnet).

3. **Sepolia session (optional)**

   ```bash
   cast send 0x060d87018EE78c2968959cA2C8a189c12953Cc9A "startNewSession()" \
     --rpc-url base_sepolia \
     --private-key $PRIVATE_KEY
   ```

4. **Chainlink oracle (when ready)**

   ```bash
   cast send 0x060d87018EE78c2968959cA2C8a189c12953Cc9A \
     "setChainlinkOracle(address)" <CHAINLINK_FORWARDER_ADDRESS> \
     --rpc-url base_sepolia \
     --private-key $PRIVATE_KEY
   ```

5. **Promote to mainnet (after testnet validation)**

   ```bash
   forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
     --rpc-url base_mainnet \
     --broadcast \
     --verify
   ```

## Operations and monitoring

- Total gas sponsored, claims processed, spend limits, contract allowlist (CDP).

### SpaceTimeDB

```bash
spacetime logs beat-me --server https://maincloud.spacetimedb.com
```

### Mainnet contract USDC balance

```bash
cast call 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 \
  "balanceOf(address)(uint256)" \
  0xaeFd92921ee2a413cE4C5668Ac9558ED68CC2F13 \
  --rpc-url https://mainnet.base.org
```

## Base Sepolia parameter reference

| Item | Value |
|------|--------|
| Network | Base Sepolia (84532) |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| LINK | `0xE4aB69C077896252FAFBD49EFD26B5D171A32410` |
| Entry fee | 1 USDC |
| Session interval | 1 week |
| Prize % | 80% |

## Benefits

**Players:** gasless claims (mainnet + paymaster), choose when to claim, clear UI, transparent tracking.

**Admin:** one `distributePrizes` tx, lower gas vs many transfers, easier scaling.

**App:** live leaderboard, persistent prizes in SpaceTimeDB, no hardcoded leaderboard data.

## Support

1. `CLAIM_SYSTEM_SETUP.md` — troubleshooting  
2. `PAYMASTER_SETUP.md` — gasless txs  
3. CDP dashboard — allowlist  
4. SpaceTimeDB logs — sync issues  

---

**Mainnet:** Code deployed; confirm paymaster allowlist in CDP.  
**Sepolia:** See [DEPLOYMENT_SUCCESS.md](./DEPLOYMENT_SUCCESS.md) for the full checklist.
