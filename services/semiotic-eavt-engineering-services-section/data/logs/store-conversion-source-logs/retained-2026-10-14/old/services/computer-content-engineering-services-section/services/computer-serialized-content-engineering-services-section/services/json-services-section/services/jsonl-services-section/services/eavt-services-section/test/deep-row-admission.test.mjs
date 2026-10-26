import assert from 'node:assert/strict';
import test from 'node:test';
import { eavtRow, isAdmittedRow, memoizeOnRow } from '../scripts/admit-row.mjs';
import { encode } from '../scripts/encode-row.mjs';
import { identify } from '../scripts/identify-row.mjs';
import { identifyContentAddressedRow } from '../scripts/identify-content-addressed-row.mjs';
import { semanticBytes, semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import { canonicalJson } from '@red-cup-engineering/json-services-section/canonical-json';

const rowOf = v => ({e: 'entity', a: 'attribute', v, t: '2026-10-11T00:00:00Z'});
function assertFrozen(root) {
  const seen = new Set(), pending = [root];
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value); assert.ok(Object.isFrozen(value));
    pending.push(...Object.values(value));
  }
}

test('admission preserves native-clone JSON values, canonical bytes and identity', () => {
  const shared = {n: -0, text: 'cedar\u0000𐀀'};
  const fixtures = [null, true, false, 0, -0, 1.25, 'salt', [], {},
    {z: [null, {a: 3}], a: [shared, shared]},
    JSON.parse('{"__proto__":{"polluted":true},"constructor":7,"toString":null,"1":1,"0":0}')];
  for (const value of fixtures) {
    const input = rowOf(value), expected = structuredClone(input), actual = eavtRow(input);
    assert.deepEqual(actual, expected); assertFrozen(actual);
    let canonical;
    try { canonical = canonicalJson(expected); }
    catch (error) {
      assert.throws(() => encode(actual), failure => failure.code === error.code);
      assert.throws(() => identify(actual), failure => failure.code === error.code);
    }
    if (canonical !== undefined) {
      assert.equal(encode(actual), canonical);
      assert.equal(identify(actual), canonical);
    }
    assert.deepEqual(semanticBytes(actual), semanticBytes(expected));
    assert.equal(identifyContentAddressedRow({row: actual}).identity, semanticId(expected));
    assert.equal(eavtRow(actual), actual); assert.ok(isAdmittedRow(actual));
  }
  const actual = eavtRow(rowOf(fixtures.at(-1))).v;
  assert.equal(Object.getPrototypeOf(actual), Object.prototype);
  assert.ok(Object.hasOwn(actual, '__proto__'));
  assert.deepEqual(actual.__proto__, {polluted: true});
  assert.equal({}.polluted, undefined);
});

test('copies remain detached, keep within-field aliases and separate field snapshots', () => {
  const child = {nested: [1, 2]}, value = {left: child, right: child};
  const input = {e: value, a: value, v: value, t: value};
  const actual = eavtRow(input);
  assert.equal(actual.v.left, actual.v.right);
  assert.notEqual(actual.v, value); assert.notEqual(actual.e, actual.v);
  child.nested.push(3); assert.deepEqual(actual.v.left.nested, [1, 2]);
  assertFrozen(actual);
  let calls = 0; const derive = memoizeOnRow(() => ++calls);
  assert.equal(derive(actual), 1); assert.equal(derive(actual), 1);
  assert.equal(derive(input), 2); assert.equal(derive(input), 3);
});

test('non-enumerable and symbol keys retain structured-clone omission', () => {
  const input = {kept: 1};
  Object.defineProperty(input, 'hidden', {value: () => {}});
  input[Symbol('ignored')] = () => {};
  const actual = eavtRow(rowOf(input)).v;
  assert.deepEqual(Reflect.ownKeys(actual), ['kept']);
});

test('array extras retain data keys, native prototypes and shared clone identity', () => {
  const child = {n: 1}, input = [child];
  Object.defineProperty(input, '__proto__', {value: child, enumerable: true});
  input.date = new Date(0); input.map = new Map([['child', child]]);
  const actual = eavtRow(rowOf(input)).v;
  assert.deepEqual(actual, structuredClone(input));
  assert.equal(Object.getPrototypeOf(actual), Array.prototype);
  assert.equal(actual[0], actual.__proto__); assert.equal(actual[0], actual.map.get('child'));
  assertFrozen(actual);
  for (const extra of [() => {}, Symbol('not cloneable')]) {
    const bad = [1]; bad.extra = extra;
    assert.throws(() => eavtRow(rowOf(bad)), {name: 'DataCloneError'});
  }
});

test('accessor reads preserve the native clone order after JSON validation', () => {
  const trace = [], child = {};
  Object.defineProperty(child, 'n', {enumerable: true, get() {trace.push('child'); return 1;}});
  const input = {};
  Object.defineProperties(input, {
    a: {enumerable: true, get() {trace.push('a'); return child;}},
    b: {enumerable: true, get() {trace.push('b'); return 2;}},
  });
  const actual = eavtRow(rowOf(input));
  // The validator snapshots Object.values, then visits the child; the clone
  // reads depth-first. The iterative fast path must not reorder those reads.
  assert.deepEqual(trace, ['a', 'b', 'child', 'a', 'child', 'b']);
  assert.deepEqual(actual.v, {a: {n: 1}, b: 2}); assertFrozen(actual);
});

test('malformed JSON and cycles remain refused before admission', () => {
  const cyclicObject = {}; cyclicObject.self = cyclicObject;
  const cyclicArray = []; cyclicArray.push(cyclicArray);
  for (const value of [undefined, NaN, Infinity, -Infinity, 1n, Symbol(), () => {},
    new Date(0), Object.create(null), Object.create({inherited: 1}),
    new Array(1), [undefined], {bad: undefined}, cyclicObject, cyclicArray]) {
    assert.throws(() => eavtRow(rowOf(value)), TypeError);
  }
  for (const value of [null, [], {}, {...rowOf(1), extra: 2}, {e: 1, a: 2, v: 3, other: 4}]) {
    assert.throws(() => eavtRow(value), TypeError);
  }
});

for (const depth of [8132, 20000]) test(`plain JSON at depth ${depth} admits without recursive clone or freeze`, () => {
  let value = {leaf: true};
  for (let n = 0; n < depth; n++) value = n % 2 ? {next: value} : [value];
  const actual = eavtRow(rowOf(value)); assertFrozen(actual);
  let original = value, copied = actual.v;
  for (let n = depth - 1; n >= 0; n--) {
    assert.notEqual(original, copied);
    original = n % 2 ? original.next : original[0];
    copied = n % 2 ? copied.next : copied[0];
  }
  assert.deepEqual(copied, {leaf: true});
});


test('cycles in non-index array extras stay refused, while extra aliases stay admissible', () => {
  const self = [1]; self.extra = self;
  const nested = [1]; nested.extra = {back: nested};
  const exotic = [1]; exotic.date = new Date(0); exotic.extra = exotic;
  for (const value of [self, nested, exotic]) assert.throws(() => eavtRow(rowOf(value)));
  const shared = {n: 1}, aliases = [shared]; aliases.extra = {a: shared, b: shared};
  const actual = eavtRow(rowOf(aliases)).v;
  assert.equal(actual[0], actual.extra.a); assert.equal(actual.extra.a, actual.extra.b);
});

test('throwing accessors retain their thrown object at validation and clone time', () => {
  const failure = new Error('accessor refused');
  const bad = Object.defineProperty({}, 'a', {enumerable: true, get() {throw failure;}});
  assert.throws(() => eavtRow(rowOf(bad)), error => error === failure);
  const extra = [1];
  Object.defineProperty(extra, 'extra', {enumerable: true, get() {throw failure;}});
  assert.throws(() => eavtRow(rowOf(extra)), error => error === failure);
});


test('admission retains lone surrogates while existing canonical encoders still refuse them', () => {
  const input = rowOf('\ud800'), actual = eavtRow(input);
  assert.deepEqual(actual, structuredClone(input));
  assert.throws(() => encode(actual), error => error.code === 'unicode-scalar');
  assert.throws(() => identify(actual), error => error.code === 'unicode-scalar');
  assert.throws(() => semanticBytes(actual), error => error.code === 'non-canonical-cbor');
  assert.throws(() => identifyContentAddressedRow({row: actual}), error => error.code === 'non-canonical-cbor');
});
