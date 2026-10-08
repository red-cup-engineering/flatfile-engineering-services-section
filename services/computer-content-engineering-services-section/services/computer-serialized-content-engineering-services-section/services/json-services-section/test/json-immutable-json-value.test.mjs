import assert from "node:assert/strict";
import test from "node:test";
import { freezeJson } from "../scripts/freeze-json.mjs";

test("makes every composite carrier in a JSON value immutable", () => {
  const value = { object: { answer: 42 }, array: [true, { nested: null }] };
  assert.equal(freezeJson(value), value);
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.object));
  assert.ok(Object.isFrozen(value.array));
  assert.ok(Object.isFrozen(value.array[1]));
});

test("refuses values outside the JSON universe", () => {
  assert.throws(() => freezeJson({ missing: undefined }), /not a JSON value/u);
});

test("preserves admitted negative zero for RFC 8785 serialization", () => {
  const value = freezeJson({ value: -0 });
  assert.ok(Object.is(value.value, -0));
});

test("already frozen parents still freeze shared mutable descendants", () => {
  const child = { values: [1, 2] };
  const value = Object.freeze({ left: child, right: child });
  const result = freezeJson(value);
  assert.equal(result, value);
  assert.equal(result.left, result.right);
  assert.equal(Object.isFrozen(child), true);
  assert.equal(Object.isFrozen(child.values), true);
});
