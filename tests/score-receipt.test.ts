/**
 * Score receipt helpers — run with: npx tsx --test tests/score-receipt.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import {
  advancePaidScore,
  signScoreReceipt,
  verifyScoreReceipt,
} from '../lib/game/scoreReceipt';

const ORIGINAL_SECRET = process.env.ENTRY_TOKEN_SECRET;

before(() => {
  process.env.ENTRY_TOKEN_SECRET = 'test-secret-for-score-receipts';
});

after(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.ENTRY_TOKEN_SECRET;
  } else {
    process.env.ENTRY_TOKEN_SECRET = ORIGINAL_SECRET;
  }
});

describe('scoreReceipt', () => {
  const entryId = 'entry-123';
  const wallet = '0xabcdef1234567890123456789012345678901234';
  const onChainSessionId = '42';

  it('signs and verifies a receipt', () => {
    const receipt = signScoreReceipt({
      eid: entryId,
      wal: wallet.toLowerCase(),
      sc: 120,
      av: 2,
      ocs: onChainSessionId,
      iat: Date.now(),
    });

    const verified = verifyScoreReceipt(receipt, entryId, wallet);
    assert.ok(verified);
    assert.equal(verified!.sc, 120);
    assert.equal(verified!.av, 2);
  });

  it('rejects tampered receipts', () => {
    const receipt = signScoreReceipt({
      eid: entryId,
      wal: wallet.toLowerCase(),
      sc: 50,
      av: 1,
      ocs: onChainSessionId,
      iat: Date.now(),
    });
    const tampered = receipt.slice(0, -4) + 'xxxx';
    assert.equal(verifyScoreReceipt(tampered, entryId, wallet), null);
  });

  it('advances cumulative score across answers', () => {
    const first = advancePaidScore({
      entryId,
      walletAddress: wallet,
      onChainSessionId,
      pointsEarned: 80,
    });
    assert.equal(first.totalScore, 80);
    assert.equal(first.answersVerified, 1);

    const second = advancePaidScore({
      entryId,
      walletAddress: wallet,
      onChainSessionId,
      pointsEarned: 0,
      previousReceipt: first.receipt,
    });
    assert.equal(second.totalScore, 80);
    assert.equal(second.answersVerified, 2);

    const third = advancePaidScore({
      entryId,
      walletAddress: wallet,
      onChainSessionId,
      pointsEarned: 60,
      previousReceipt: second.receipt,
    });
    assert.equal(third.totalScore, 140);
    assert.equal(third.answersVerified, 3);
  });
});
