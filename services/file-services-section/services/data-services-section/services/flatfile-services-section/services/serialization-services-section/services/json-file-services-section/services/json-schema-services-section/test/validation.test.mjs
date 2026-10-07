import assert from "node:assert/strict";
import test from "node:test";
import { compileJsonSchema, validateJsonSchema } from "../src/validation.mjs";
test("validates nested object requirements and additional properties", () => {
    const schema = {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", minLength: 2 } },
        additionalProperties: false,
    };
    assert.equal(validateJsonSchema({ name: "Ada" }, schema).valid, true);
    const invalid = validateJsonSchema({ name: "A", extra: true }, schema);
    assert.equal(invalid.valid, false);
    assert.deepEqual(invalid.issues.map((entry) => entry.keyword), ["additionalProperties", "minLength"]);
});
test("supports boolean schemas, arrays, numeric bounds, enums, and formats", () => {
    assert.equal(validateJsonSchema("anything", true).valid, true);
    assert.equal(validateJsonSchema("anything", false).valid, false);
    assert.equal(validateJsonSchema([2, 4], { type: "array", minItems: 2, items: { type: "integer", minimum: 2 } }).valid, true);
    assert.equal(validateJsonSchema("nope", { enum: ["yes", "maybe"] }).valid, false);
    assert.equal(validateJsonSchema("not-an-email", { type: "string", format: "email" }).valid, false);
});
test("uses exactly-one rather than any-of semantics and preserves JSON equality", () => {
    const overlap = { $id: "test/overlap", oneOf: [{ type: "number" }, { type: "integer" }] };
    assert.equal(validateJsonSchema(1, overlap).valid, false);
    assert.equal(validateJsonSchema(1.5, overlap).valid, true);
    assert.equal(validateJsonSchema(1, { anyOf: [{ type: "number" }, { type: "integer" }] }).valid, true);
    assert.equal(validateJsonSchema({ a: [1, { b: true }], c: null }, { const: { c: null, a: [1, { b: true }] } }).valid, true);
    assert.equal(validateJsonSchema({ a: [1, { b: false }], c: null }, { enum: [{ c: null, a: [1, { b: true }] }] }).valid, false);
});
test("uses explicit, transitive cross-schema references without coercing or mutating values", () => {
    const leaf = { $id: "https://registry.561.group/schema/leaf.json", type: "object", required: ["id"], properties: { id: { type: "integer" } }, additionalProperties: false };
    const middle = { $id: "https://registry.561.group/schema/middle.json", $defs: { leaf: { $ref: "leaf.json" } } };
    const root = { $id: "https://registry.561.group/schema/root.json", type: "object", required: ["child"], properties: { child: { $ref: "middle.json#/$defs/leaf" } } };
    assert.equal(validateJsonSchema({ child: { id: 1 } }, root, { references: [middle, leaf] }).valid, true);
    const value = { child: { id: "1" } };
    assert.equal(validateJsonSchema(value, root, { references: [middle, leaf] }).issues[0]?.kind, "instance");
    assert.deepEqual(value, { child: { id: "1" } });
    const missing = validateJsonSchema({ child: { id: 1 } }, root, { references: [middle] });
    assert.equal(missing.valid, false);
    assert.equal(missing.issues[0]?.kind, "schema");
});
test("reports invalid schemas separately from invalid instances", () => {
    const invalid = validateJsonSchema("x", { type: "not-a-json-schema-type" });
    assert.equal(invalid.valid, false);
    assert.deepEqual(invalid.issues.map((entry) => entry.kind), ["schema"]);
    const instance = validateJsonSchema({ extra: true }, { type: "object", additionalProperties: false });
    assert.equal(instance.valid, false);
    assert.deepEqual(instance.issues.map((entry) => entry.kind), ["instance"]);
});
test("preserves native URI bases and schema-looking data", () => {
    const child = { $id: "https://registry.561.group/schema/nested/child.json", type: "string" };
    const root = { $id: "https://registry.561.group/schema/root.json", $defs: { nested: { $id: "nested/branch.json", $ref: "child.json" } }, $ref: "#/$defs/nested" };
    assert.equal(validateJsonSchema("x", root, { references: [child] }).valid, true);
    assert.equal(validateJsonSchema({ $id: "data", $ref: "data-ref" }, { const: { $id: "data", $ref: "data-ref" } }).valid, true);
    const first = compileJsonSchema({ $id: "https://registry.561.group/schema/same.json", type: "integer" });
    const second = compileJsonSchema({ $id: "https://registry.561.group/schema/same.json", type: "string" });
    assert.equal(first.validate(1).valid, true);
    assert.equal(first.validate("1").valid, false);
    assert.equal(second.validate("1").valid, true);
});
