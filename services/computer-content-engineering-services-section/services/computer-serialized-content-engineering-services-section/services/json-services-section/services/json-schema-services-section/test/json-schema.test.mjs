import assert from "node:assert/strict";
import test from "node:test";
import { validateSchemaInstance } from "../scripts/validate-schema-instance.mjs";
import { assertSchema } from "../scripts/assert-schema.mjs";
import { DRAFT_2020_12 } from "../src/schema-vocabulary.mjs";

test("judges a JSON instance through its explicit schema carrier", () => {
  assert.deepEqual(
    validateSchemaInstance({
      instance: { a: 1 },
      schema: { type: "object", required: ["a"] },
    }),
    { ok: true, errors: [] },
  );
});

test("additional-property schemas validate values and prototype names are ordinary absent keys", () => {
  assert.equal(
    validateSchemaInstance({
      instance: { extra: 1 },
      schema: { type: "object", additionalProperties: { type: "string" } },
    }).ok,
    false,
  );
  assert.equal(
    validateSchemaInstance({
      instance: {},
      schema: { type: "object", required: ["toString"] },
    }).ok,
    false,
  );
});

test("prefixItems judges a tuple positionally, distinct from items", () => {
  const schema = {
    type: "array",
    prefixItems: [{ type: "string" }, { type: "integer" }],
    items: false,
    minItems: 2,
    maxItems: 2,
  };
  assert.equal(validateSchemaInstance({ instance: ["p", 1], schema }).ok, true);
  const wrongType = validateSchemaInstance({ instance: ["p", "q"], schema });
  assert.equal(wrongType.ok, false);
  assert.deepEqual(
    wrongType.errors.map((error) => [error.pointer, error.keyword]),
    [["/1", "type"]],
  );
  const extra = validateSchemaInstance({ instance: ["p", 1, "surplus"], schema });
  assert.equal(extra.ok, false);
  assert.deepEqual(
    extra.errors.map((error) => [error.pointer, error.keyword]),
    [["", "maxItems"], ["/2", "false schema"]],
  );
});

test("prefixItems with a schema tail validates items beyond the tuple against items", () => {
  const schema = {
    type: "array",
    prefixItems: [{ const: "branch" }],
    items: { type: "string" },
  };
  assert.equal(validateSchemaInstance({ instance: ["branch", "a", "b"], schema }).ok, true);
  const badTail = validateSchemaInstance({ instance: ["branch", "a", 3], schema });
  assert.equal(badTail.ok, false);
  assert.deepEqual(
    badTail.errors.map((error) => [error.pointer, error.keyword]),
    [["/2", "type"]],
  );
});

test("a $ref to the Draft 2020-12 meta-schema URI judges the value as a schema document, not as a fetched document", () => {
  const schema = { $ref: DRAFT_2020_12 };
  assert.equal(validateSchemaInstance({ instance: { type: "string", minLength: 2 }, schema }).ok, true);
  assert.equal(validateSchemaInstance({ instance: true, schema }).ok, true);
  assert.equal(validateSchemaInstance({ instance: false, schema }).ok, true);
  const onUnsupportedKeyword = validateSchemaInstance({ instance: { type: "string", patternProperties: {} }, schema });
  assert.equal(onUnsupportedKeyword.ok, false);
  assert.deepEqual(
    onUnsupportedKeyword.errors.map((error) => [error.pointer, error.keyword]),
    [["", "$ref"]],
  );
  assert.equal(validateSchemaInstance({ instance: "not a schema at all", schema }).ok, false);
});

test("assertSchema admits prefixItems and still checks its member schemas", () => {
  assertSchema({
    schema: {
      type: "array",
      prefixItems: [{ type: "string" }, { type: "string" }],
      items: false,
    },
  });
  assert.throws(
    () =>
      assertSchema({
        schema: { type: "array", prefixItems: [{ type: "string" }, { bogus: true }] },
      }),
    /unsupported Draft 2020-12 keyword bogus/,
  );
});
