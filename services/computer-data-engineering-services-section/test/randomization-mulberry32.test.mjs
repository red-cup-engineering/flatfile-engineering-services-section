import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/randomization/mulberry32.mjs';
import { hashSeed } from '../src/randomization/hash-seed.mjs';

test('mulberry32: known output stream for a fixed numeric seed', () => {
  const next = mulberry32(12345);
  const got = [next(), next(), next(), next(), next()];
  assert.deepEqual(got, [
    0.9797282677609473,
    0.3067522644996643,
    0.484205421525985,
    0.817934412509203,
    0.5094283693470061,
  ]);
});

test('mulberry32: known output stream for a zero seed', () => {
  const next = mulberry32(0);
  const got = [next(), next(), next()];
  assert.deepEqual(got, [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197]);
});

test('mulberry32: composed with hashSeed, known output for a fixed seed string', () => {
  const next = mulberry32(hashSeed('cast:test'));
  const got = [next(), next(), next()];
  assert.deepEqual(got, [0.5653406037017703, 0.902359496569261, 0.05576209491118789]);
});

test('mulberry32: the same seed always reproduces the same stream (determinism)', () => {
  const a = mulberry32(561);
  const b = mulberry32(561);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('mulberry32: every value lands in [0, 1)', () => {
  const next = mulberry32(999);
  for (let i = 0; i < 200; i++) {
    const v = next();
    assert.ok(v >= 0 && v < 1);
  }
});

test('mulberry32: returns a bare function, not an object (the bots.mjs call shape)', () => {
  const next = mulberry32(1);
  assert.equal(typeof next, 'function');
});
