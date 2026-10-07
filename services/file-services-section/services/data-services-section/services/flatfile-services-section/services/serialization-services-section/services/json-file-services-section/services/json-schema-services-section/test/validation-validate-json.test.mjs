import assert from "node:assert/strict";
import test from "node:test";
import { validateJson } from "../src/validation.mjs";

test("reports valid for an instance satisfying its schema", () => {
  const result = validateJson({ value: { a: 1 }, schema: { type: "object", required: ["a"] } });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("reports errors for an instance violating its schema", () => {
  const result = validateJson({ value: {}, schema: { type: "object", required: ["a"] } });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length > 0, true);
});

test("resolves an internal $ref against a supplied schemas corpus", () => {
  const other = { "$id": "urn:example:other", type: "string" };
  const schema = { "$ref": "urn:example:other" };
  const result = validateJson({ value: "x", schema, schemas: [other] });
  assert.equal(result.valid, true);
});

test("refuses a request with no schema", () => {
  assert.throws(() => validateJson({ value: 1 }), /schema is required/u);
});
