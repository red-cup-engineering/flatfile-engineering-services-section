import assert from "node:assert/strict";
import test from "node:test";
import { getAllRegisteredSchemaUris } from "@hyperjump/json-schema/draft-2020-12";
import { checkSchema, evaluateSchemaInstance } from "../src/schema-evaluation.mjs";
import { validateSchemaInstance } from "../scripts/validate-schema-instance.mjs";

test("native corpora preserve dynamic references, annotation policy and independent caller identifiers", async () => {
  const retained = getAllRegisteredSchemaUris().sort();
  const results = await Promise.all(["integer", "string", "boolean"].map(type => evaluateSchemaInstance({
    schema: { $id: "https://example.com/root", $ref: "child" },
    schemas: [{ $id: "https://example.com/child", type }], value: 1,
  })));
  assert.deepEqual(results.map(r => r.valid), [true, false, false]);
  for (const result of results) assert.equal(result.evaluated, true);
  const schema = { $defs: { text: { $dynamicAnchor: "text", type: "string" } }, type: "array", items: { $dynamicRef: "#text" } };
  const bad = await evaluateSchemaInstance({ schema, value: [42] });
  assert.equal(bad.evaluated, true); assert.equal(bad.valid, false);
  assert.equal(bad.errors[0].instanceLocation, "#/0");
  assert(bad.errors[0].absoluteKeywordLocation.endsWith("/$defs/text/type"));
  const annotated = await evaluateSchemaInstance({ schema: { type: "string", format: "date" }, value: "2023-02-30" });
  const asserted = await evaluateSchemaInstance({ schema: { type: "string", format: "date" }, value: "2023-02-30", assertFormats: true });
  assert.equal(annotated.valid, true); assert.equal(asserted.valid, false);
  assert.deepEqual(getAllRegisteredSchemaUris().sort(), retained);
});

test("failed compilation stays distinct from invalid data and cannot retrieve ambient resources or replace built-ins", async () => {
  const retained = getAllRegisteredSchemaUris().sort();
  let fetched = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { fetched++; throw Error("unexpected network"); };
  try {
    const invalid = await checkSchema({ schema: { type: 42 } });
    assert.equal(invalid.evaluated, false); assert.equal(invalid.diagnostic.output.valid, false);
    for (const reference of ["https://private.example/schema", "file:///private-schema.json"]) {
      const missing = await evaluateSchemaInstance({ schema: { $ref: reference }, value: 1 });
      assert.equal(missing.evaluated, false); assert.equal(Object.hasOwn(missing, "valid"), false);
    }
    const collision = await checkSchema({ baseUri: "https://json-schema.org/draft/2020-12/schema", schema: {} });
    assert.equal(collision.evaluated, false);
    assert.equal((await checkSchema({ schema: { type: "integer" } })).valid, true);
    assert.equal(fetched, 0); assert.deepEqual(getAllRegisteredSchemaUris().sort(), retained);
  } finally { globalThis.fetch = originalFetch; }
  assert.equal(validateSchemaInstance({ instance: "2023-02-30", schema: { type: "string", format: "date" } }).ok, false);
  assert.equal(validateSchemaInstance({ instance: ["a"], schema: { contains: { type: "string" } } }).ok, true);
  // The bounded process judge refuses a known keyword it does not implement instead of ignoring it (the native engine above implements minContains).
  const unimplemented = validateSchemaInstance({ instance: ["a"], schema: { contains: { type: "string" }, minContains: 1 } });
  assert.equal(unimplemented.ok, false);
  assert.equal(unimplemented.errors[0].keyword, "schema");
  assert.equal((await evaluateSchemaInstance({ schema: { contains: { type: "string" }, minContains: 1 }, value: ["a"] })).valid, true);
  assert.equal(validateSchemaInstance({ instance: "2023-02-30T10:00:00Z", schema: { type: "string", format: "date-time" } }).ok, false);
});
