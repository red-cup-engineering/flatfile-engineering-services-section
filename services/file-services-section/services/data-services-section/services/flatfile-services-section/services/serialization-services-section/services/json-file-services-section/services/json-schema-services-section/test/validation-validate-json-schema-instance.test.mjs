import assert from "node:assert/strict";
import test from "node:test";
import { validateJsonSchemaInstance } from "../src/validation.mjs";

test("reports valid for an instance satisfying its schema", () => {
  const result = validateJsonSchemaInstance({ value: { a: 1 }, schema: { type: "object", required: ["a"] } });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("reports errors for an instance violating its schema", () => {
  const result = validateJsonSchemaInstance({ value: {}, schema: { type: "object", required: ["a"] } });
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].kind, "instance");
  assert.equal(result.errors[0].keyword, "required");
});

test("reports schema errors as schema issues", () => {
  const result = validateJsonSchemaInstance({ value: {}, schema: { type: "object", required: "a" } });
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].kind, "schema");
});

test("refuses a request with no schema", () => {
  assert.throws(() => validateJsonSchemaInstance({ value: 1 }), /schema is required/u);
});

test("resolves a cross-schema $ref when the referenced schema is supplied in references", () => {
  const root = { $id: "root.json", type: "object", required: ["child"], properties: { child: { $ref: "leaf.json" } } };
  const leaf = { $id: "leaf.json", type: "object", required: ["id"], properties: { id: { type: "integer" } } };
  const result = validateJsonSchemaInstance({ value: { child: { id: 1 } }, schema: root, references: [leaf] });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("reports the same unresolved-$ref schema error when no references are supplied", () => {
  const root = { $id: "root.json", type: "object", required: ["child"], properties: { child: { $ref: "leaf.json" } } };
  const withoutReferences = validateJsonSchemaInstance({ value: { child: { id: 1 } }, schema: root });
  const withEmptyReferences = validateJsonSchemaInstance({ value: { child: { id: 1 } }, schema: root, references: [] });
  assert.equal(withoutReferences.valid, false);
  assert.equal(withoutReferences.errors[0].kind, "schema");
  assert.deepEqual(withoutReferences, withEmptyReferences);
});
