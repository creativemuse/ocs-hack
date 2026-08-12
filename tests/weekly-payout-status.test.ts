/**
 * Weekly payout status labels — run with: npx tsx --test tests/weekly-payout-status.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getWeeklyPayoutStatus } from '../lib/game/weeklyPayoutStatus';

describe('getWeeklyPayoutStatus', () => {
  it('shows awaiting score sync when interval elapsed without on-chain scores', () => {
    // now = Tuesday Aug 11 2026 21:41 UTC -> next Sunday = Aug 16 2026
    const now = Math.floor(new Date('2026-08-11T21:41:00Z').getTime() / 1000)
    const status = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: true,
      sessionPrizePool: 8,
      countdownExpired: true,
      hasOnChainScores: false,
      sessionCounter: 1,
      now,
    });
    assert.equal(status.phase, 'awaiting_score_sync');
    assert.equal(status.timerLabel, 'PAYOUT PENDING');
    assert.ok(status.weekSubtitle.includes('Weekly payout processes Sun, Aug 16 00:00 UTC'));
  });

  it('shows session complete when prizes have already been distributed', () => {
    const status = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: false,
      sessionPrizePool: 8,
      distributed: true,
      countdownExpired: true,
      hasOnChainScores: true,
      sessionCounter: 1,
    });
    assert.equal(status.phase, 'session_complete');
    assert.equal(status.timerLabel, 'WEEK COMPLETE');
  });

  it('shows session complete when prizes have already been distributed', () => {
    const status = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: false,
      sessionPrizePool: 8,
      distributed: true,
      countdownExpired: true,
      hasOnChainScores: true,
      sessionCounter: 1,
    });
    assert.equal(status.phase, 'session_complete');
    assert.equal(status.timerLabel, 'WEEK COMPLETE');
  });

  it('shows payout processing when scores exist but pool remains', () => {
    const status = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: true,
      sessionPrizePool: 8,
      countdownExpired: true,
      hasOnChainScores: true,
      sessionCounter: 1,
    });
    assert.equal(status.phase, 'payout_pending');
    assert.equal(status.timerLabel, 'PAYOUT PROCESSING');
  });

  it('uses accurate week subtitle', () => {
    const status = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: false,
      sessionPrizePool: 0,
      countdownExpired: true,
      hasOnChainScores: false,
      sessionCounter: 1,
    });
    assert.ok(status.weekSubtitle.includes('new week starts when the next player joins'));
  });

  it('includes CRE skip reason in subtitle when provided', () => {
    const status = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: true,
      sessionPrizePool: 8,
      countdownExpired: true,
      hasOnChainScores: false,
      sessionCounter: 1,
      creSkipReason: 'no_on_chain_scores',
    });
    assert.ok(status.weekSubtitle.includes('no_on_chain_scores'));
  });

  it('computes next Sunday run date dynamically from now', () => {
    // Sunday Aug 9 2026 00:00 UTC -> strictly next Sunday is Aug 16
    const sunday = Math.floor(new Date('2026-08-09T00:00:00Z').getTime() / 1000)
    const statusSun = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: true,
      sessionPrizePool: 8,
      countdownExpired: true,
      hasOnChainScores: false,
      sessionCounter: 1,
      now: sunday,
    })
    assert.ok(statusSun.weekSubtitle.includes('Sun, Aug 16 00:00 UTC'))

    // Wednesday Aug 12 2026 -> next Sunday is Aug 16
    const wed = Math.floor(new Date('2026-08-12T12:00:00Z').getTime() / 1000)
    const statusWed = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: true,
      sessionPrizePool: 8,
      countdownExpired: true,
      hasOnChainScores: false,
      sessionCounter: 1,
      now: wed,
    })
    assert.ok(statusWed.weekSubtitle.includes('Sun, Aug 16 00:00 UTC'))
  });
});
