import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalCarrier, canonicalizeSemioticJson, retainedCarrier, semanticBytes, semanticId } from '../src/semiotic-content-address.mjs';

const raw = 'ta\u0302che', normalized = 'tâche';

test('retained snapshots preserve nested text and map-key representatives without aliasing callers', () => {
  const source = { subject: raw, nested: { [raw]: [raw] } };
  const held = retainedCarrier(source);
  source.subject = 'changed'; source.nested[raw][0] = 'changed';
  assert.equal(held.subject, raw);
  assert.deepEqual(Object.keys(held.nested), [raw]);
  assert.deepEqual(held.nested[raw], [raw]);
  for (const value of [held, held.nested, held.nested[raw]]) assert.ok(Object.isFrozen(value));
  assert.equal(retainedCarrier(held), held);
});

test('retained snapshots never bypass canonical text and key normalization or address identity', () => {
  const source = { subject: raw, nested: { [raw]: raw } };
  const held = retainedCarrier(source);
  const expected = { subject: normalized, nested: { [normalized]: normalized } };
  const before = semanticId(source);
  assert.equal(semanticId(held), before);
  assert.deepEqual(canonicalizeSemioticJson(held), expected);
  const canonical = canonicalCarrier(held);
  assert.notEqual(canonical, held);
  assert.deepEqual(canonical, expected);
  assert.equal(semanticId(canonical), before);
  assert.equal(held.subject, raw);
  assert.deepEqual(canonicalCarrier({ child: held }).child, expected);
});

test('retained byte members own private bytes and canonical output bytes cannot poison a snapshot', () => {
  const input = new Uint8Array([1, 2, 3]);
  const held = retainedCarrier({ subject: raw, bytes: input, nested: [input] });
  const address = semanticId(held);
  input[0] = 9; held.bytes[1] = 9; held.nested[0][2] = 9;
  assert.deepEqual([...held.bytes], [1, 2, 3]);
  assert.deepEqual([...held.nested[0]], [1, 2, 3]);
  const canonical = canonicalCarrier(held);
  canonical.bytes[0] = 9;
  semanticBytes(held).fill(0);
  semanticBytes(canonical).fill(0);
  assert.equal(semanticId(held), address);
  assert.equal(semanticId(canonical), address);
  assert.notEqual(held.bytes, held.bytes);
});

test('a root byte snapshot is owned but never memoized as immutable content', () => {
  const input = new Uint8Array([1, 2]);
  const held = retainedCarrier(input), before = semanticId(held);
  held[0] = 3;
  assert.deepEqual([...input], [1, 2]);
  assert.notEqual(semanticId(held), before);
});

test('NFC-colliding map keys remain outside the admitted carrier domain', () => {
  const collision = Object.freeze({ [raw]: 1, [normalized]: 2 });
  for (const operation of [retainedCarrier, canonicalCarrier, canonicalizeSemioticJson, semanticBytes]) assert.throws(() => operation(collision), /collide after NFC normalization/);
  const held = retainedCarrier({ [raw]: 1 });
  assert.deepEqual(Object.keys(held), [raw]);
  assert.deepEqual(Object.keys(canonicalCarrier(held)), [normalized]);
});

test('raw snapshotting retains prototype-shaped keys and refuses cycles', () => {
  const source = JSON.parse('{"__proto__":{"text":"tâche"}}');
  const held = retainedCarrier(source);
  assert.ok(Object.hasOwn(held, '__proto__'));
  assert.equal(Object.getPrototypeOf(held), Object.prototype);
  assert.equal(held.__proto__.text, raw);
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => retainedCarrier(cycle), /cyclic/);
});
