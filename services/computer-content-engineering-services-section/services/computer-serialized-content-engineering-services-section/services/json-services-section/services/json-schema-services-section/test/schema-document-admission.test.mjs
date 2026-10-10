import assert from "node:assert/strict";
import test from "node:test";
import { validateJsonSchemaDocument } from "../src/validation.mjs";
test("schema admission uses dialect rules without requiring referenced instances", () => {
    assert.equal(validateJsonSchemaDocument({ $ref: "https://example.test/not-fetched", unevaluatedProperties: false }).valid, true);
    assert.equal(validateJsonSchemaDocument({ properties: { name: { type: "string", format: "email" } } }).valid, true);
    const invalid = validateJsonSchemaDocument({ properties: { name: 3 } });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.issues.every(issue => issue.kind === "schema"));
    assert.equal(validateJsonSchemaDocument({ type: "made-up" }).valid, false);
    assert.equal(validateJsonSchemaDocument(false).valid, true);
});
