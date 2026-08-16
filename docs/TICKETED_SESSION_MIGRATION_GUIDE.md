# Migration Guide: TriviaBattle → TriviaBattlev5 (Ticketed Per-Session)

## What changed

TriviaBattlev5 makes each weekly session independent:

- Entry fees go into a **per-session prize pool**.
- Scores are stored **per session id**.
- Prizes are distributed **per session id**, even after a new session has started.
- `sessionCounter` is still the live/visible session, but closed sessions retain their state.

This fixes the bug where a paid player whose game crosses a session rollover loses their score/prize because the contract only remembered the live session.

## Contract migration checklist

### 1. Deploy the new contract

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd /Users/sirgawain/Developer/ocs-hack

forge script script/DeployTriviaBattle.s.sol:DeployTriviaBattle \
  --rpc-url base_mainnet \
  --broadcast \
  --verify
```

Save the deployed address. The script prints a post-deployment checklist.

### 2. Set the Chainlink CRE forwarder

Base mainnet forwarder (verify in CRE dashboard or docs):

```bash
export FORWARDER=0xF8344CFd5c43616a4366C34E3EEE75af79a74482
cast send <NEW_CONTRACT_ADDRESS> \
  "setChainlinkOracle(address)" $FORWARDER \
  --rpc-url base_mainnet \
  --private-key $PRIVATE_KEY
```

### 3. Update all contract-address references

- `env.example`
- `NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS` (Vercel env + local `.env`)
- `lib/blockchain/contracts.ts` default address
- `chainlink-cre-workflows/weekly-prize-distribution/config.production.json`
- `chainlink-cre-workflows/weekly-prize-distribution/config.staging.json` (if used)
- Any hardcoded addresses in `deploy-*.sh`, `scripts/`, or docs

## CRE workflow migration (required)

The existing workflow `weekly-prize-dist-prod` is incompatible with v5 because:

1. It calls `distributePrizes()` with **no arguments**, which in v5 targets the live `sessionCounter`.
2. It infers `prizesDistributed` from `!isActive && prizePool == 0`, which is no longer correct.
3. It fetches rankings and calls `submitScores(...)` without a session id, so scores land in the live session.

### Required changes to `chainlink-cre-workflows/weekly-prize-distribution/main.ts`

1. **Replace `currentSessionPrizePool()` reads**
   - Old: `currentSessionPrizePool()` returns the live session pool.
   - New: read `getSessionInfo(sessionId)` to get a specific session's pool and `distributed` flag.

2. **Determine the distribution target**
   - Read `sessionCounter()`.
   - If the live session has ended and is not distributed, target `sessionCounter`.
   - Otherwise, target `sessionCounter - 1` (the most recently ended session).
   - Alternatively, scan backwards from `sessionCounter` to find the first non-distributed, ended session.

3. **Replace `submitScores(...)`**
   - Old: `submitScores(address[], uint256[])` targets the live session.
   - New: `submitScoresForSession(sessionId, address[], uint256[])` targets the correct session.

4. **Replace `distributePrizes()`**
   - Old: `distributePrizes()` targets the live session.
   - New: `distributePrizes(sessionId)` targets the correct session.
   - Better: use `syncAndDistributeForSession(sessionId, address[], uint256[])` so the workflow submits scores and distributes atomically in one report.

5. **Fix `prizesDistributed` detection**
   - Use `getSessionInfo(sessionId).distributed`.

6. **Update the local ABI snippets**
   - The workflow embeds minimal ABIs in `main.ts`. Add `getSessionInfo(uint256)` and `syncAndDistributeForSession(uint256, address[], uint256[])` ABIs.

### Suggested new distribution flow

```text
onWeeklyDistribution:
  sessionId = findDistributionTarget()
  if sessionId == 0: skip
  if getSessionInfo(sessionId).distributed: skip
  if block.timestamp < getSessionInfo(sessionId).endTime: skip

  rankings = fetchRankings(sessionId)        // GET /api/chainlink/session-rankings?sessionId=...
  if rankings empty:
    syncScoresFromApp(sessionId)               // POST /api/submit-onchain-scores { sessionId }
    rankings = fetchRankings(sessionId)

  addresses, scores = rankings
  call syncAndDistributeForSession(sessionId, addresses, scores)
  verify getSessionInfo(sessionId).distributed
```

### Example payload change

Old report payload:

```ts
const callData = encodeFunctionData({
  abi: [{ name: "distributePrizes", inputs: [], ... }],
  functionName: "distributePrizes",
})
```

New report payload:

```ts
const sessionId = ...
const callData = encodeFunctionData({
  abi: [{
    name: "syncAndDistributeForSession",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionId", type: "uint256" },
      { name: "playerAddresses", type: "address[]" },
      { name: "scores", type: "uint256[]" },
    ],
  }],
  functionName: "syncAndDistributeForSession",
  args: [sessionId, addresses, scores],
})
```

### Redeploy the workflow

After editing `main.ts`:

```bash
cd chainlink-cre-workflows
bun install --cwd weekly-prize-distribution

# Deploy updated workflow
cre workflow deploy weekly-prize-distribution --target production-settings --yes

# Re-activate (only needed if deployment did not auto-activate)
cre workflow activate weekly-prize-distribution --target production-settings --yes

# Simulate
cre workflow simulate weekly-prize-distribution --target production-settings --non-interactive --trigger-index 0
```

## Frontend / API changes

1. **Leaderboard keying**
   - `lib/game/weeklyLeaderboard.ts`: keep `resolveAuthoritativeSessionId` preferring the **live** `sessionCounter` for now because the leaderboard displays the current open session.
   - `app/api/save-paid-score/route.ts`: after v5 deployment, the score should be written against the token's `onChainSessionId` if you want per-session leaderboards; otherwise the live counter is fine for the active session.

2. **New contract view functions**
   - `getSessionInfo(uint256)`
   - `getPlayerScoreForSession(uint256, address)`
   - `submitScoresForSession(uint256, address[], uint256[])`
   - `syncAndDistributeForSession(uint256, address[], uint256[])`
   - `distributePrizes(uint256)`

3. **Score submission API**
   - `app/api/submit-onchain-scores/route.ts` must accept a `sessionId` parameter and call the matching contract function.

## Test verification

Run the v5 tests locally:

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd /Users/sirgawain/Developer/ocs-hack
forge test --match-contract TriviaBattlev5Test -vvv
```

Expected: 16 passing tests covering per-session entries, rollover scoring, rollover distribution, and emergency withdrawal.

## Rollback plan

If the v5 deployment causes issues:

1. Revert `NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS` to the old address.
2. Revert the CRE workflow to the previous `main.ts`.
3. Keep v5 contract deployed for post-mortem; emergency-withdraw remaining USDC if necessary.

## Open decisions

- Should the CRE workflow distribute the **previous** session only, or scan and distribute **all** undistributed sessions in one run?
- Should players be blocked from joining within N minutes of session end to avoid race-condition entries?
- Should the frontend leaderboard show closed sessions as "past weeks"?

Document the decisions before mainnet migration.
