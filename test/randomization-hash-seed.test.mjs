import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed } from '../src/randomization/hash-seed.mjs';

test('hashSeed: known FNV-1a fold for a fixed seed string', () => {
  assert.equal(hashSeed('seeded-random-test'), 3222499798);
});

test('hashSeed: known fold for the empty string (the FNV offset basis)', () => {
  assert.equal(hashSeed(''), 2166136261);
});

test('hashSeed: distinct strings fold to distinct seeds (no trivial collision)', () => {
  assert.notEqual(hashSeed('a'), hashSeed('b'));
});

test('hashSeed: deterministic across repeated calls', () => {
  assert.equal(hashSeed('cast:test'), hashSeed('cast:test'));
});

test('hashSeed: always returns a 32-bit unsigned integer', () => {
  const h = hashSeed('any seed string here');
  assert.ok(Number.isInteger(h));
  assert.ok(h >= 0 && h <= 0xffffffff);
});

test('hashSeed: rejects a non-string input', () => {
  assert.throws(() => hashSeed(42), TypeError);
});
