/**
 * Paid game start helpers — run with: npx tsx --test tests/paid-game-start.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { retryWithBackoff } from '../lib/game/retryWithBackoff';
import {
  savePendingPaidEntry,
  loadPendingPaidEntry,
  clearPendingPaidEntry,
} from '../lib/game/pendingPaidEntry';

describe('retryWithBackoff', () => {
  it('returns on first success', async () => {
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls += 1;
      return 'ok';
    });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
  });

  it('retries on retryable errors then succeeds', async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new Error('Transaction not found (may still be pending)');
        }
        return 'verified';
      },
      { maxAttempts: 5, initialDelayMs: 1, maxDelayMs: 4 }
    );
    assert.equal(result, 'verified');
    assert.equal(calls, 3);
  });

  it('throws immediately on non-retryable errors', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        retryWithBackoff(async () => {
          calls += 1;
          throw new Error('paidTxHash required for paid entry');
        }),
      /paidTxHash required/
    );
    assert.equal(calls, 1);
  });
});

describe('pendingPaidEntry (sessionStorage)', () => {
  const storage = new Map<string, string>();
  let originalWindow: typeof globalThis.window | undefined;

  beforeEach(() => {
    storage.clear();
    originalWindow = globalThis.window;
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    };
    (globalThis as { window?: Window; sessionStorage?: Storage }).window = {
      sessionStorage: fakeStorage,
    } as unknown as Window;
    (globalThis as { sessionStorage?: Storage }).sessionStorage = fakeStorage;
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('save, load, and clear for matching wallet', () => {
    savePendingPaidEntry({
      paidTxHash: '0x' + 'a'.repeat(64),
      playerMode: 'paid_solo',
      walletAddress: '0xAbCdEf1234567890123456789012345678901234',
    });

    const loaded = loadPendingPaidEntry('0xabcdef1234567890123456789012345678901234');
    assert.ok(loaded);
    assert.equal(loaded!.paidTxHash, '0x' + 'a'.repeat(64));
    assert.equal(loaded!.playerMode, 'paid_solo');

    clearPendingPaidEntry();
    assert.equal(loadPendingPaidEntry('0xabcdef1234567890123456789012345678901234'), null);
  });

  it('returns null when wallet does not match', () => {
    savePendingPaidEntry({
      paidTxHash: '0x' + 'b'.repeat(64),
      playerMode: 'paid_multiplayer',
      walletAddress: '0x1111111111111111111111111111111111111111',
    });

    assert.equal(
      loadPendingPaidEntry('0x2222222222222222222222222222222222222222'),
      null
    );
  });
});

describe('batchCalls status helpers', () => {
  it('extractLastTxHash uses final receipt in batch', async () => {
    const { pollBatchCallsStatus } = await import('../lib/base-account/batchCalls');

    const provider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'wallet_getCallsStatus') {
          return {
            status: 200,
            receipts: [
              { transactionHash: '0x' + '1'.repeat(64) },
              { transactionHash: '0x' + '2'.repeat(64) },
            ],
          };
        }
        throw new Error('unexpected');
      },
    };

    const hash = await pollBatchCallsStatus(provider, 'calls-id-test');
    assert.equal(hash, '0x' + '2'.repeat(64));
  });

  it('pollBatchCallsStatus accepts a single atomic receipt object', async () => {
    const { pollBatchCallsStatus } = await import('../lib/base-account/batchCalls');

    const provider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'wallet_getCallsStatus') {
          return {
            status: 200,
            atomic: true,
            receipts: { transactionHash: '0x' + '3'.repeat(64), status: '0x1' },
          };
        }
        throw new Error('unexpected');
      },
    };

    const hash = await pollBatchCallsStatus(provider, 'calls-id-test');
    assert.equal(hash, '0x' + '3'.repeat(64));
  });

  it('sendAtomicBatchCalls accepts object-shaped sendCalls ids', async () => {
    const { sendAtomicBatchCalls } = await import('../lib/base-account/batchCalls');
    const callsId = '0x' + '4'.repeat(64);
    const txHash = '0x' + '5'.repeat(64);

    const provider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'wallet_sendCalls') {
          return { batchId: callsId, status: 'pending' };
        }
        if (method === 'wallet_getCallsStatus') {
          return {
            status: 201,
            atomic: true,
            receipts: [{ transactionHash: txHash, status: '0x1' }],
          };
        }
        throw new Error('unexpected');
      },
    };

    const hash = await sendAtomicBatchCalls(
      provider,
      '0x1111111111111111111111111111111111111111',
      [
        {
          to: '0x2222222222222222222222222222222222222222',
          value: '0x0',
          data: '0x',
        },
      ]
    );
    assert.equal(hash, txHash);
  });

  it('extractCallsId ignores unexpected response payloads', async () => {
    const { extractCallsId } = await import('../lib/base-account/batchCalls');

    assert.equal(extractCallsId(null), undefined);
    assert.equal(extractCallsId(undefined), undefined);
    assert.equal(extractCallsId(123 as never), undefined);
    assert.equal(extractCallsId({ id: 123 }), undefined);
    assert.equal(extractCallsId({ result: { callsId: '0xabc' } }), '0xabc');
  });

  it('pollBatchCallsStatus treats numeric string statuses correctly', async () => {
    const { pollBatchCallsStatus } = await import('../lib/base-account/batchCalls');
    const txHash = '0x' + '6'.repeat(64);
    let calls = 0;

    const provider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'wallet_getCallsStatus') {
          calls += 1;
          if (calls === 1) {
            return { status: '100' };
          }
          return {
            status: '200',
            atomic: true,
            receipts: [{ transactionHash: txHash, status: '0x1' }],
          };
        }
        throw new Error('unexpected');
      },
    };

    const hash = await pollBatchCallsStatus(provider, 'calls-id-test');
    assert.equal(hash, txHash);
  });
});
