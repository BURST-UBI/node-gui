import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount } from '../src/lib/utils.ts';

test('small positive rates and balances are not displayed as zero', () => {
  for (const raw of ['1', '7', '0007', '999999999999']) {
    assert.equal(formatAmount(raw), '<0.000001');
  }
  assert.equal(formatAmount('0'), '0');
  assert.equal(formatAmount('1000000000000'), '0.000001');
});

test('normal and u128 balances retain grouping without floating-point conversion', () => {
  assert.equal(formatAmount('1000000000000000000'), '1');
  assert.equal(formatAmount('1234567890123456789'), '1.234567');
  assert.equal(formatAmount('340282366920938463463374607431768211455'), '340,282,366,920,938,463,463.374607');
});
