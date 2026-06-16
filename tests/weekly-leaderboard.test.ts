/**
 * Weekly leaderboard ranking — run with: npx tsx --test tests/weekly-leaderboard.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeWeeklyLeaderboardEntries,
  computeRankForScore,
  isNewWeeklyLeader,
  type WeeklyLeaderboardEntry,
} from '../lib/game/weeklyLeaderboard';

const walletA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const walletB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('weekly leaderboard latest-score semantics', () => {
  it('prefers on-chain score over spacetime when both exist', () => {
    const merged = mergeWeeklyLeaderboardEntries(
      1,
      new Map([[walletA, 1160]]),
      [
        {
          walletAddress: walletA,
          weeklySessionId: BigInt(1),
          weeklyBestScore: 2060,
        },
      ],
      10,
    );

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.bestScore, 1160);
  });

  it('uses spacetime score when wallet is not yet on chain', () => {
    const merged = mergeWeeklyLeaderboardEntries(
      1,
      new Map(),
      [
        {
          walletAddress: walletA,
          weeklySessionId: BigInt(1),
          weeklyBestScore: 1800,
        },
      ],
      10,
    );

    assert.equal(merged[0]?.bestScore, 1800);
  });

  it('ranks using latest score instead of keeping a higher prior score', () => {
    const entries: WeeklyLeaderboardEntry[] = [
      { walletAddress: walletA, bestScore: 2060, sessionCounter: 1 },
    ];

    assert.equal(computeRankForScore(entries, walletA, 1160), 1);
    assert.equal(isNewWeeklyLeader(entries, walletA, 1160), false);
  });

  it('detects a genuine new weekly leader', () => {
    const entries: WeeklyLeaderboardEntry[] = [
      { walletAddress: walletB, bestScore: 2000, sessionCounter: 1 },
      { walletAddress: walletA, bestScore: 1500, sessionCounter: 1 },
    ];

    assert.equal(computeRankForScore(entries, walletA, 2500), 1);
    assert.equal(isNewWeeklyLeader(entries, walletA, 2500), true);
  });

  it('does not mark a lower rerun as a new leader when alone on the board', () => {
    const entries: WeeklyLeaderboardEntry[] = [
      { walletAddress: walletA, bestScore: 2060, sessionCounter: 1 },
    ];

    assert.equal(computeRankForScore(entries, walletA, 1160), 1);
    assert.equal(isNewWeeklyLeader(entries, walletA, 1160), false);
  });

  it('adds a first-time player to the board', () => {
    const entries: WeeklyLeaderboardEntry[] = [
      { walletAddress: walletB, bestScore: 900, sessionCounter: 1 },
    ];

    assert.equal(computeRankForScore(entries, walletA, 1200), 1);
    assert.equal(isNewWeeklyLeader(entries, walletA, 1200), true);
  });

  it('does not mark a lower rerun as a new leader when there are other players on the board', () => {
    const entries: WeeklyLeaderboardEntry[] = [
      { walletAddress: walletA, bestScore: 2060, sessionCounter: 1 },
      { walletAddress: walletB, bestScore: 1500, sessionCounter: 1 },
    ];

    assert.equal(computeRankForScore(entries, walletA, 1800), 1);
    assert.equal(isNewWeeklyLeader(entries, walletA, 1800), false);
  });
});
