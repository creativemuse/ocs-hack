# Ticketed Per-Session Game Implementation Plan

## Goal

Make each paid entry belong to a specific weekly `sessionCounter`. Entry fees, scores, and prizes are scoped to that session, so a player who paid into session N can still submit a score for session N after session N+1 has started.

## Why this matters

The current `TriviaBattle.sol` stores entry fees and scores only for the **live** `sessionCounter`. When a session rolls over while a paid player is mid-game, their score/prize association is lost. The UI promises weekly contests; the contract must match that model.

## Contract changes

A new `TriviaBattlev5.sol` has been created as a drop-in ABI replacement for `TriviaBattle.sol`.

### What changed

- Added a `Session` struct keyed by `sessionCounter`.
- Per-session storage:
  - `players[]`
  - `hasParticipated`
  - `playerScores`
  - `prizePool`
  - `isActive`
  - `distributed`
- Entry in `joinBattle()` is locked to the current `sessionCounter`.
- New `submitScoresForSession(sessionId, ...)` allows late score submission.
- New `syncAndDistributeForSession(sessionId, ...)` atomically submits scores and distributes prizes for a closed session.
- `startNewSession()` auto-finalizes the previous session when its interval has elapsed.
- Legacy functions `submitScores(...)`, `distributePrizes()`, `syncAndDistribute(...)`, `getPlayerScore(...)`, and `getCurrentPlayers()` are preserved for ABI compatibility and target the live session.

### Files

- `contracts/TriviaBattlev5.sol`
- `test/TriviaBattlev5.t.sol`
- `script/DeployTriviaBattle.s.sol` (updated to deploy v5)

## Frontend / API changes

### Phase A (completed)

Reverted the temporary leaderboard-session fix; the leaderboard once again keys on the live `sessionCounter` to match the current live contract.

### Phase B (after v5 deployment)

1. Update `NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS` everywhere.
2. Add new ABI entries to `lib/blockchain/contracts.ts` for v5 view/write functions.
3. Update `app/api/submit-onchain-scores/route.ts` to accept and forward a `sessionId`.
4. Update `app/api/save-paid-score/route.ts` to write scores against the token's `onChainSessionId` if per-session leaderboards are desired.
5. Update leaderboard merge logic to allow querying historical sessions.

## Chainlink CRE / Automation migration

### Problem

The existing workflow `weekly-prize-dist-prod` is incompatible with v5:

- Calls `distributePrizes()` without arguments, which distributes the **live** session.
- Calls `submitScores(...)` without a session id, which writes to the live session.
- Infers `prizesDistributed` from `!isActive && prizePool == 0`, which is no longer correct.

### Required workflow changes

1. Replace `currentSessionPrizePool()` reads with `getSessionInfo(sessionId)`.
2. Determine the distribution target by reading `sessionCounter()` and selecting the most recently ended, non-distributed session.
3. Use `submitScoresForSession(sessionId, ...)` or `syncAndDistributeForSession(sessionId, ...)`.
4. Use `getSessionInfo(sessionId).distributed` to detect completed distributions.
5. Update local ABI snippets in `main.ts`.
6. Redeploy/activate the workflow.

### Detailed steps

See `docs/TICKETED_SESSION_MIGRATION_GUIDE.md`.

## Deployment order

1. Merge `TriviaBattlev5.sol`, tests, and updated deploy script.
2. Deploy v5 to Base Sepolia.
3. Run Sepolia integration tests with the frontend + CRE workflow.
4. Deploy v5 to Base Mainnet.
5. Update all environment variables and configs.
6. Update and redeploy the CRE workflow.
7. Set the CRE forwarder address on the new contract.
8. Run a manual `startNewSession()` and verify end-to-end flow.

## Testing status

- `forge test --match-contract TriviaBattlev5Test -vvv` passes with 16 tests.
- No SpacetimeDB changes are required for Phase A/B unless you decide to store per-session historical data off-chain.

## Risk register

| Risk | Mitigation |
|------|------------|
| New contract address breaks existing leaderboard/payment verification | Update `NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS` in all env files and Vercel dashboard before traffic hits it. |
| CRE workflow calls wrong session | Update and simulate workflow on Sepolia before mainnet. |
| Old contract USDC trapped | Use `initiateEmergencyWithdraw` / `executeWithdrawal` on the old contract after migration. |
| Player scores submitted to wrong session | Use `onChainSessionId` from the JWT/receipt in `save-paid-score`. |

## Open decisions

1. Should the CRE workflow distribute only the previous session, or scan all undistributed sessions?
2. Should there be a join cutoff buffer before session end?
3. Should closed weekly sessions become browseable "past weeks" in the UI?

Resolve these before mainnet migration.
