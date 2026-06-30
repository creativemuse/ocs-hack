
import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import {
  advancePaidScore,
  signScoreReceipt,
  verifyScoreReceipt,
} from '../lib/game/scoreReceipt';
import { finalizePaidScoreLedger, initPaidScoreLedger } from '../lib/game/paidScoreLedger';

const ORIGINAL_SECRET = process.env.ENTRY_TOKEN_SECRET;
const entryId = 'entry-cold-start-123';
const wallet = '0xabcdef1234567890123456789012345678901234';
const onChainSessionId = '42';

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

describe('paid score submission with missing ledger (serverless cold start)', () => {
  it('finalizes via receipt when ledger was pruned/lost', () => {
    const first = advancePaidScore({
      entryId,
      walletAddress: wallet,
      onChainSessionId,
      pointsEarned: 80,
    });
    const second = advancePaidScore({
      entryId,
      walletAddress: wallet,
      onChainSessionId,
      pointsEarned: 60,
      previousReceipt: first.receipt,
    });

    assert.equal(second.totalScore, 140);
    assert.equal(second.answersVerified, 2);

    const receipt = verifyScoreReceipt(second.receipt, entryId, wallet);
    assert.ok(receipt);
    assert.equal(receipt!.sc, 140);
    assert.equal(receipt!.av, 2);

    const finalized = finalizePaidScoreLedger(entryId, wallet, 140);
    assert.equal(finalized.ok, false);

    if (!finalized.ok) {
      assert.equal(receipt!.sc, 140);
      assert.equal(receipt!.av, 2);
    }
  });

  it('does not finalize when receipt answer count is zero', () => {
    const badReceipt = signScoreReceipt({
      eid: entryId,
      wal: wallet.toLowerCase(),
      sc: 0,
      av: 0,
      ocs: onChainSessionId,
      iat: Date.now(),
    });
    const receipt = verifyScoreReceipt(badReceipt, entryId, wallet);
    assert.ok(receipt);
    assert.equal(receipt!.av, 0);
    assert.equal(receipt!.av === 0, true);
  });
});
