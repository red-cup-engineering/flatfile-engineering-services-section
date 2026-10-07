import assert from "node:assert/strict";
import test from "node:test";
import { admitSchema } from "../scripts/admit-schema.mjs";
import { censusSchemaArtifacts } from "../scripts/census-schema-artifacts.mjs";
import { resolveSchemaPointer } from "../scripts/resolve-schema-pointer.mjs";
import { validateSchemaInstance } from "../scripts/validate-schema-instance.mjs";
import { cohereSchemaAssertions } from "../scripts/cohere-schema-assertions.mjs";
import { foldSchemaAssertions } from "../scripts/fold-schema-assertions.mjs";
import { unfoldSchema } from "../scripts/unfold-schema.mjs";

test("schema pointer assertions round-trip and preserve contradictions", () => {
  const schema = admitSchema({
    schema: {
      $id: "example/schema",
      type: "object",
      properties: { name: { type: "string" } },
    },
  }).schema;
  const assertions = unfoldSchema({ schema, time: "t1" }).assertions;
  assert.deepEqual(foldSchemaAssertions({ assertions }).schema, schema);
  assert.equal(
    cohereSchemaAssertions({
      assertions: [...assertions, { e: "#", a: "type", v: "array", t: "t2" }],
    }).schema,
    null,
  );
});

test("validation resolves only the explicit corpus and reports the refusing keyword", () => {
  const name = admitSchema({
    schema: { $id: "name", type: "string", minLength: 2 },
  }).schema;
  const person = admitSchema({
    schema: {
      $id: "person",
      type: "object",
      required: ["name", "tags"],
      properties: {
        name: { $ref: "name" },
        tags: { type: "array", uniqueItems: true, contains: { const: "held" } },
      },
      additionalProperties: false,
    },
  }).schema;
  assert.equal(
    validateSchemaInstance({
      instance: { name: "Ada", tags: ["held"] },
      schema: person,
      schemas: [name],
    }).ok,
    true,
  );
  const refusal = validateSchemaInstance({
    instance: { name: "A", tags: ["lost", "lost"], extra: true },
    schema: person,
    schemas: [name],
  });
  assert.equal(refusal.ok, false);
  assert.deepEqual(
    new Set(refusal.errors.map((error) => error.keyword)),
    new Set(["minLength", "uniqueItems", "contains", "additionalProperties"]),
  );
  assert.equal(
    validateSchemaInstance({
      instance: { name: "Ada", tags: ["held"] },
      schema: person,
    }).ok,
    false,
  );
});

test("pointer lookup and census keep their authority in caller-provided carriers", () => {
  assert.deepEqual(
    resolveSchemaPointer({
      document: { "a/b": ["held"] },
      pointer: "#/a~1b/0",
    }),
    { found: true, value: "held" },
  );
  assert.deepEqual(
    censusSchemaArtifacts({
      entries: [
        { path: "live/a.schema.json", content: "{}" },
        {
          path: "legacy/validator.mjs",
          content: "export function validateSchemaInstance() {}",
        },
      ],
    }).counts,
    {
      "schema-document": 1,
      "schema-implementation": 0,
      "legacy-schema-document": 0,
      "legacy-implementation": 1,
      other: 0,
    },
  );
});
