import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalCarrier,
  canonicalizeSemioticJson,
  semanticId,
} from "../src/semiotic-content-address.mjs";

const values = [null, false, true, 0, -2, 1.5, "", "text", [], [null, true, 1], {}, { payload: "owned" }];
const ownProto = (value) => JSON.parse(`{"__proto__":${JSON.stringify(value)},"retained":true}`);

function assertPlainJsonPrototypes(value) {
  if (value === null || typeof value !== "object") return;
  assert.strictEqual(Object.getPrototypeOf(value), Array.isArray(value) ? Array.prototype : Object.prototype);
  for (const member of Object.values(value)) assertPlainJsonPrototypes(member);
}

function assertFrozenJson(value) {
  if (value === null || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value));
  for (const member of Object.values(value)) assertFrozenJson(member);
}

function unchangedInputAndGlobal(input, expected, prototypes) {
  assert.deepEqual(input, expected);
  assertPlainJsonPrototypes(input);
  assert.equal(Object.isFrozen(input), false);
  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), prototypes);
}

test("canonicalization preserves an own __proto__ member for every JSON value kind", () => {
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  for (const value of values) {
    const input = ownProto(value);
    const expected = JSON.parse(JSON.stringify(input));
    const output = canonicalizeSemioticJson(input);
    assert.deepEqual(output, expected);
    assert.equal(Object.hasOwn(output, "__proto__"), true);
    assert.deepEqual(Object.getOwnPropertyDescriptor(output, "__proto__"), {
      value: expected.__proto__, enumerable: true, writable: true, configurable: true,
    });
    assertPlainJsonPrototypes(output);
    unchangedInputAndGlobal(input, expected, prototypes);
  }
});

test("canonicalization preserves nested own members and other prototype-related names", () => {
  const input = JSON.parse('{"list":[{"__proto__":{"__proto__":"deep","constructor":null}}],"__proto__":[{"__proto__":false}],"constructor":{"prototype":{"__proto__":0}},"toString":true,"hasOwnProperty":"own"}');
  const expected = JSON.parse(JSON.stringify(input));
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  const output = canonicalizeSemioticJson(input);
  assert.deepEqual(output, expected);
  assertPlainJsonPrototypes(output);
  unchangedInputAndGlobal(input, expected, prototypes);
});

test("own members retain the NFC normalization and collision-refusal contract", () => {
  const input = JSON.parse('{"__proto__":{"cafe\\u0301":"cafe\\u0301"}}');
  const expected = JSON.parse('{"__proto__":{"caf\\u00e9":"caf\\u00e9"}}');
  const before = JSON.parse(JSON.stringify(input));
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  const output = canonicalizeSemioticJson(input);
  assert.deepEqual(output, expected);
  assertPlainJsonPrototypes(output);
  const collision = JSON.parse('{"__proto__":{"caf\\u00e9":1,"cafe\\u0301":2}}');
  assert.throws(() => canonicalizeSemioticJson(collision), /collide after NFC normalization/u);
  unchangedInputAndGlobal(input, before, prototypes);
});

test("canonical carriers freeze own-member copies without freezing or changing the input", () => {
  const input = JSON.parse('{"__proto__":{"items":[{"__proto__":[null,true]}]},"retained":1}');
  const expected = JSON.parse(JSON.stringify(input));
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  const output = canonicalCarrier(input);
  assert.deepEqual(output, expected);
  assertPlainJsonPrototypes(output);
  assertFrozenJson(output);
  unchangedInputAndGlobal(input, expected, prototypes);
  assert.equal(Object.isFrozen(input.__proto__), false);
});

test("canonicalization still refuses cycles and admits shared acyclic own-member values", () => {
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  const cyclic = {};
  Object.defineProperty(cyclic, "__proto__", { value: cyclic, enumerable: true });
  assert.throws(() => canonicalizeSemioticJson(cyclic), /must not be cyclic/u);
  assert.strictEqual(Object.getPrototypeOf(cyclic), Object.prototype);
  assert.strictEqual(cyclic.__proto__, cyclic);
  const shared = { payload: [1, null] };
  const input = ownProto(shared);
  input.__proto__ = shared;
  input.first = shared;
  input.second = shared;
  const expected = JSON.parse(JSON.stringify(input));
  const output = canonicalizeSemioticJson(input);
  assert.deepEqual(output, expected);
  assertPlainJsonPrototypes(output);
  assert.strictEqual(input.first, input.second);
  assert.strictEqual(input.first, input.__proto__);
  unchangedInputAndGlobal(input, expected, prototypes);
});

test("an own __proto__ field is part of canonical content identity", () => {
  assert.notEqual(semanticId(ownProto(null)), semanticId({ retained: true }));
  assert.notEqual(semanticId(ownProto(7)), semanticId(ownProto(null)));
});
