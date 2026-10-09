import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed } from '../src/randomization/hash-seed.mjs';
import { mulberry32 } from '../src/randomization/mulberry32.mjs';
import { randomStream, seededStream } from '../src/randomization/stream.mjs';

test('seededStream: same seed string -> identical, infinite stream of next() values, forever', () => {
  const a = seededStream('daily-2026-08-19');
  const b = seededStream('daily-2026-08-19');
  const seqA = Array.from({ length: 500 }, () => a.next());
  const seqB = Array.from({ length: 500 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('seededStream: different seed strings diverge', () => {
  const a = seededStream('seed-a');
  const b = seededStream('seed-b');
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.notDeepEqual(seqA, seqB);
});

test('seededStream: next() always in [0, 1)', () => {
  const rng = seededStream('range-probe');
  for (let i = 0; i < 2000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1, `next() out of range: ${v}`);
  }
});

test('seededStream: int(min, max) always within the inclusive range', () => {
  const rng = seededStream('int-probe');
  for (let i = 0; i < 1000; i++) {
    const v = rng.int(1, 6);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 6, `int out of range: ${v}`);
  }
});

test('seededStream: int(min, max) covers every value in a small range given enough draws', () => {
  const rng = seededStream('coverage-probe');
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(rng.int(1, 6));
  assert.equal(seen.size, 6);
});

test('seededStream: chance(p) respects p = 0 and p = 1 exactly', () => {
  const rng = seededStream('chance-probe');
  for (let i = 0; i < 50; i++) {
    assert.equal(rng.chance(0), false);
  }
  for (let i = 0; i < 50; i++) {
    assert.equal(rng.chance(1), true);
  }
});

test('seededStream: pick() returns undefined for an empty list, else an element of the list', () => {
  const rng = seededStream('pick-probe');
  assert.equal(rng.pick([]), undefined);
  const items = ['a', 'b', 'c'];
  for (let i = 0; i < 20; i++) {
    assert.ok(items.includes(rng.pick(items)));
  }
});

test('seededStream: shuffle() is a permutation and never mutates its input', () => {
  const rng = seededStream('shuffle-probe');
  const items = [1, 2, 3, 4, 5];
  const copy = [...items];
  const shuffled = rng.shuffle(items);
  assert.deepEqual(items, copy, 'input array must not be mutated');
  assert.deepEqual([...shuffled].sort((a, b) => a - b), copy);
});

test('property — same seed, same rolls, forever: 100 independently constructed Rngs from the same seed agree on 1000 draws each', () => {
  for (let trial = 0; trial < 100; trial++) {
    const rng = seededStream(`trial-${trial}`);
    const rngAgain = seededStream(`trial-${trial}`);
    const seq1 = Array.from({ length: 1000 }, () => rng.next());
    const seq2 = Array.from({ length: 1000 }, () => rngAgain.next());
    assert.deepEqual(seq1, seq2, `trial ${trial} diverged`);
  }
});

test('seededStream: parts namespace the seed exactly as [seed, ...parts].join(":")', () => {
  assert.equal(seededStream('root', 'dice', 3).next(), seededStream('root:dice:3').next());
  assert.notEqual(seededStream('root', 'dice').next(), seededStream('root', 'reels').next());
});

test('randomStream: next() is mulberry32 over the given state, draw for draw', () => {
  const stream = randomStream(hashSeed('state-probe'));
  const raw = mulberry32(hashSeed('state-probe'));
  for (let i = 0; i < 100; i++) assert.equal(stream.next(), raw());
});
