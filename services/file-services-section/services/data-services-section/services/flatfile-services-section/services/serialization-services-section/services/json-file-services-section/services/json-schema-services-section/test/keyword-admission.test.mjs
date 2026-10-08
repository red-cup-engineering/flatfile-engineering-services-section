import assert from "node:assert/strict";
import test from "node:test";
import { createSchema } from "../dist/index.mjs";
import { assertSchema } from "../scripts/assert-schema.mjs";
import { validateSchemaInstance } from "../scripts/validate-schema-instance.mjs";

const malformed = [
  {type: "garbage"}, {type: []}, {type: ["string", "string"]},
  {required: ["x", "x"]}, {required: "x"},
  {minimum: "2"}, {multipleOf: 0}, {minLength: -1}, {minItems: 1.5},
  {allOf: []}, {enum: "x"}, {uniqueItems: 1}, {$ref: 1},
];

test("both admission paths reject malformed nested contracts before instance evaluation", () => {
  for (const keywords of malformed) {
    const schema = {$id: "urn:test:malformed", type: "object", properties: {value: keywords}};
    assert.throws(() => createSchema(schema), TypeError);
    assert.throws(() => assertSchema({schema}), TypeError);
    const verdict = validateSchemaInstance({schema, instance: {}});
    assert.equal(verdict.ok, false);
    assert.equal(verdict.errors[0].keyword, "schema");
  }
});

test("valid unions, empty required and enum arrays, and zero bounds remain admissible", () => {
  for (const keywords of [{type: ["string", "null"]}, {required: []}, {enum: []}, {minLength: 0}, {minimum: 0}, {uniqueItems: false}]) {
    const schema = {$id: "urn:test:valid", ...keywords};
    assert.deepEqual(createSchema(schema).schema.$id, schema.$id);
    assert.equal(assertSchema({schema}), schema);
  }
});
