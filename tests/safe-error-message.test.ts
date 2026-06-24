/**
 * safeErrorMessage tests — run with: npx tsx --test tests/safe-error-message.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeErrorMessage } from '../lib/utils/safeErrorMessage';

describe('safeErrorMessage', () => {
  it('returns Error.message', () => {
    assert.equal(safeErrorMessage(new Error('boom')), 'boom');
  });

  it('does not throw on circular objects', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    const message = safeErrorMessage(circular);
    assert.ok(message.length > 0);
  });
});
