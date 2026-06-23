/**
 * Weekly payout status labels — run with: npx tsx --test tests/weekly-payout-status.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getWeeklyPayoutStatus } from '../lib/game/weeklyPayoutStatus';

describe('getWeeklyPayoutStatus', () => {
  it('shows awaiting score sync when interval elapsed without on-chain scores', () => {
    const status = getWeeklyPayoutStatus({
      isLoading: false,
      isSessionActive: true,
      sessionPrizePool: 8,
      countdownExpired: true,
      hasOnChainScores: false,
      sessionCounter: 1,
    });
    assert.equal(status.phase, 'awaiting_score_sync');
    assert.equal(status.timerLabel, 'AWAITING SCORE SYNC');
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
});
