import assert from 'node:assert/strict';
import test from 'node:test';
import { copyJson, freezeJson } from '../scripts/freeze-json.mjs';
import { isJsonValue } from '../scripts/is-json-value.mjs';

test('copyJson validates the input by default, including values a native clone would normalize', () => {
  const cycle = {}; cycle.self = cycle;
  for (const value of [undefined, NaN, Infinity, 1n, Symbol(), () => {}, new Date(0),
    Object.create(null), Object.create({inherited: true}), [, 1], {bad: undefined}, cycle]) {
    assert.throws(() => copyJson(value), TypeError);
  }
});

test('already-admitted copy avoids rereading original accessors before the snapshot', () => {
  const trace = [], child = {};
  Object.defineProperty(child, 'value', {enumerable: true, get() {trace.push('child'); return 1;}});
  const value = {};
  Object.defineProperties(value, {
    a: {enumerable: true, get() {trace.push('a'); return child;}},
    b: {enumerable: true, get() {trace.push('b'); return 2;}},
  });
  assert.equal(isJsonValue(value), true);
  const actual = copyJson(value, {inputAlreadyAdmitted: true});
  assert.deepEqual(trace, ['a', 'b', 'child', 'a', 'child', 'b']);
  assert.deepEqual(actual, {a: {value: 1}, b: 2});
});

test('default freezeJson retains historical treatment of non-index cycles; EAVT mode refuses', () => {
  const defaultValue = [1]; defaultValue.extra = defaultValue;
  assert.equal(freezeJson(defaultValue), defaultValue);
  assert.equal(defaultValue.extra, defaultValue); assert.ok(Object.isFrozen(defaultValue));
  const strictValue = [1]; strictValue.extra = {back: strictValue};
  assert.throws(() => freezeJson(strictValue, {rejectCycles: true}), /cycles/);
});

test('structured-clone extras retain prototypes, own __proto__ keys and aliases', () => {
  const child = {n: 1}, value = [child];
  value.extra = new Map([['same', child]]); value.date = new Date(0);
  Object.defineProperty(value, '__proto__', {value: child, enumerable: true});
  const actual = copyJson(value);
  assert.deepEqual(actual, structuredClone(value));
  assert.equal(actual[0], actual.extra.get('same'));
  assert.equal(actual[0], actual.__proto__);
  assert.equal(Object.getPrototypeOf(actual), Array.prototype);
  for (const bad of [() => {}, Symbol()]) {
    const array = [1]; array.extra = bad;
    assert.throws(() => copyJson(array), {name: 'DataCloneError'});
  }
});


test('already-admitted option still refuses a non-JSON snapshot result', () => {
  const cyclic = {}; cyclic.self = cyclic;
  for (const value of [undefined, NaN, Infinity, 1n, Symbol(), () => {},
    new Date(0), [, 1], {bad: undefined}, cyclic]) {
    assert.throws(() => copyJson(value, {inputAlreadyAdmitted: true}));
  }
});
