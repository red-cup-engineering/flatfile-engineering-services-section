import assert from "node:assert/strict";
import test from "node:test";
import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "../src/semiotic-expression-notation/semantic-content-identity.mjs";

const OBJECT_KIND = "test.content-library.own-json-members";
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

test("semantic admission preserves own __proto__ values and token/value agreement", () => {
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  for (const value of values) {
    const input = ownProto(value);
    const expected = JSON.parse(JSON.stringify(input));
    const identified = identifyJsonSemanticContent({ objectKind: OBJECT_KIND, value: input, witnessRoot: EMPTY_WITNESS_ROOT });
    const admitted = admitJsonSemanticContent({ bytes: identified.bytes, token: identified.token, objectKind: OBJECT_KIND });
    assert.deepEqual(admitted.value, expected);
    assert.equal(Object.hasOwn(admitted.value, "__proto__"), true);
    assertPlainJsonPrototypes(admitted.value);
    assertFrozenJson(admitted.value);
    assert.equal(admitted.token, identified.token);
    const reidentified = identifyJsonSemanticContent({ objectKind: OBJECT_KIND, value: admitted.value, witnessRoot: EMPTY_WITNESS_ROOT });
    assert.equal(reidentified.token, identified.token);
    assert.deepEqual(reidentified.bytes, identified.bytes);
    unchangedInputAndGlobal(input, expected, prototypes);
  }
});

test("semantic admission preserves nested special members and ordinary controls", () => {
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  for (const text of [
    '{"ordinary":{"payload":"owned"},"retained":true}',
    '{"constructor":{"prototype":"own"},"toString":null,"hasOwnProperty":true}',
    '{"items":[{"__proto__":{"__proto__":7}}],"__proto__":[{"__proto__":null}]}',
  ]) {
    const input = JSON.parse(text);
    const expected = JSON.parse(text);
    const identified = identifyJsonSemanticContent({ objectKind: OBJECT_KIND, value: input, witnessRoot: EMPTY_WITNESS_ROOT });
    const admitted = admitJsonSemanticContent({ bytes: identified.bytes, token: identified.token, objectKind: OBJECT_KIND });
    assert.deepEqual(admitted.value, expected);
    assertPlainJsonPrototypes(admitted.value);
    assertFrozenJson(admitted.value);
    assert.equal(identifyJsonSemanticContent({ objectKind: OBJECT_KIND, value: admitted.value, witnessRoot: EMPTY_WITNESS_ROOT }).token, identified.token);
    unchangedInputAndGlobal(input, expected, prototypes);
  }
});

test("semantic content identity carries no Node-only import in its module", async () => {
  const { readFile } = await import("node:fs/promises");
  const text = await readFile(new URL("../src/semiotic-expression-notation/semantic-content-identity.mjs", import.meta.url), "utf8");
  assert.equal(/from\s+["']node:/.test(text), false);
  assert.equal(/\bBuffer\b/.test(text.replace(/\/\/.*$/gm, "").replace(/globalThis\.Buffer/g, "")), false);
});
