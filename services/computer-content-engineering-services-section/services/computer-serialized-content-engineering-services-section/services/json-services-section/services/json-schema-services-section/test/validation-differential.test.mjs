// This file used to hold a differential test between the interpretive
// evaluator (src/validation.mjs) and ajv, run as a one-time proof that the
// interpretive evaluator reproduces the previous ajv-based evaluator's
// observable behaviour. ajv is gone from the house; the proof it stood for
// is done and does not need re-running on every test pass. The one
// assertion below did not depend on ajv -- it is kept as a plain test of
// the interpretive evaluator's own snapshot semantics.
import assert from "node:assert/strict";
import test from "node:test";
import { compileJsonSchema } from "../src/validation.mjs";

test("a compiled evaluator is a snapshot: mutating the caller's schema afterwards changes nothing", () => {
    const schema = { type: "object", required: ["value"], properties: { value: { type: "integer" } } };
    const reference = { $id: "urn:test:ref", type: "integer" };
    const compiled = compileJsonSchema({ $ref: "urn:test:ref" }, { references: [reference] });
    const direct = compileJsonSchema(schema);
    schema.properties.value.type = "string";
    reference.type = "string";
    assert.equal(direct.validate({ value: "text" }).valid, false);
    assert.equal(direct.validate({ value: 2 }).valid, true);
    assert.equal(compiled.validate("text").valid, false);
    assert.equal(compiled.validate(2).valid, true);
});
