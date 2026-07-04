/**
 * Weekly leaderboard ranking — run with: npx tsx --test tests/weekly-leaderboard.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeWeeklyLeaderboardEntries,
  computeRankForScore,
  isNewWeeklyLeader,
  isFirstScoreOnEmptyBoard,
  resolveAuthoritativeSessionId,
  parseSessionIdNumeric,
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

describe('weekly session transitions', () => {
  it('includes spacetime scores for the current week', () => {
    const merged = mergeWeeklyLeaderboardEntries(
      2,
      new Map(),
      [
        {
          walletAddress: walletA,
          weeklySessionId: BigInt(2),
          weeklyBestScore: 1500,
        },
      ],
      10,
    );

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.bestScore, 1500);
    assert.equal(merged[0]?.sessionCounter, 2);
  });

  it('excludes spacetime scores from a prior week', () => {
    const merged = mergeWeeklyLeaderboardEntries(
      2,
      new Map(),
      [
        {
          walletAddress: walletA,
          weeklySessionId: BigInt(1),
          weeklyBestScore: 2500,
        },
      ],
      10,
    );

    assert.equal(merged.length, 0);
  });

  it('prefers the live on-chain session counter over a stale token session id', () => {
    // The weekly leaderboard is keyed to the live sessionCounter. A token issued when
    // the player joined/paid may reference an older session if the counter advanced
    // while they were finishing their run; the score must be attributed to the
    // current live counter to appear on the leaderboard.
    assert.equal(resolveAuthoritativeSessionId('1', 2), '2');
    assert.equal(resolveAuthoritativeSessionId('3', 2), '2');
    // Falls back to the token value only when the live counter cannot be read.
    assert.equal(resolveAuthoritativeSessionId('', 2), '2');
    assert.equal(resolveAuthoritativeSessionId('5', 0), '5');
    assert.equal(resolveAuthoritativeSessionId('0', 0), '0');
    assert.equal(parseSessionIdNumeric(''), 0);
  });

  it('detects first score on an empty board', () => {
    assert.equal(isFirstScoreOnEmptyBoard([]), true);
    assert.equal(
      isFirstScoreOnEmptyBoard([{ walletAddress: walletA, bestScore: 100, sessionCounter: 2 }]),
      false,
    );
  });
});
