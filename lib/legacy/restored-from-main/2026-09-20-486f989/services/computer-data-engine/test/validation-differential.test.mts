// The interpretive evaluator is held to the previous ajv-based evaluator's
// observable behaviour: for every (schema, references, instance) case in the
// corpus below, and for every specification document this package ships,
// both evaluators must produce identical ValidationResult values (same
// issue kinds, paths, keywords, messages, and order).  ajv is a development
// dependency for this proof only; nothing in dist imports it.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { Ajv } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import formats from "ajv-formats";
import { compileJsonSchema, validateJsonSchemaDocument, type JsonSchema, type ValidationIssue, type ValidationResult } from "../src/validation.mts";

const addFormats = formats as unknown as typeof import("ajv-formats").default;
const DRAFT_07 = "http://json-schema.org/draft-07/schema#";

function referenceDialect(schema: JsonSchema): string {
  if (typeof schema === "boolean") return "2020";
  const declared = schema["$schema"];
  if (declared === undefined || declared === "https://json-schema.org/draft/2020-12/schema") return "2020";
  if (declared === DRAFT_07 || declared === "https://json-schema.org/draft-07/schema#") return "07";
  throw new TypeError(`unsupported JSON Schema dialect ${String(declared)}`);
}

function referenceAjv(dialect: string) {
  const ajv = dialect === "07"
    ? new Ajv({ allErrors: true, strict: false, coerceTypes: false, removeAdditional: false, useDefaults: false, logger: false })
    : new Ajv2020({ allErrors: true, strict: false, coerceTypes: false, removeAdditional: false, useDefaults: false, logger: false });
  addFormats(ajv);
  return ajv;
}

function order(issues: readonly ValidationIssue[]): readonly ValidationIssue[] {
  return [...issues].sort((left, right) => {
    for (const [a, b] of [[left.kind, right.kind], [left.path, right.path], [left.keyword, right.keyword], [left.message, right.message]] as const) {
      if (a < b) return -1;
      if (a > b) return 1;
    }
    return 0;
  });
}

/** The previous evaluator, verbatim in behaviour. */
function referenceValidate(value: unknown, schema: JsonSchema, references: readonly JsonSchema[] = []): ValidationResult {
  try {
    const dialect = referenceDialect(schema);
    if (references.some((reference) => referenceDialect(reference) !== dialect)) throw new TypeError("cross-schema references must use the root schema dialect");
    const ajv = referenceAjv(dialect);
    for (const reference of references) ajv.addSchema(reference);
    const validator = ajv.compile(schema);
    if (validator(value)) return { valid: true, issues: [] };
    return { valid: false, issues: order((validator.errors ?? []).map((error) => ({ kind: "instance", path: error.instancePath ?? "", keyword: error.keyword ?? "validation", message: error.message ?? "does not satisfy the schema" }))) };
  } catch (error) {
    return { valid: false, issues: [{ kind: "schema", path: "", keyword: "schema", message: error instanceof Error ? error.message : String(error) }] };
  }
}

function referenceValidateDocument(schema: JsonSchema): ValidationResult {
  try {
    const ajv = referenceAjv(referenceDialect(schema));
    if (ajv.validateSchema(schema)) return { valid: true, issues: [] };
    return { valid: false, issues: order((ajv.errors ?? []).map((error) => ({ kind: "schema", path: error.instancePath ?? "", keyword: error.keyword ?? "schema", message: error.message ?? "does not satisfy its JSON Schema dialect" }))) };
  } catch (error) {
    return { valid: false, issues: [{ kind: "schema", path: "", keyword: "schema", message: error instanceof Error ? error.message : String(error) }] };
  }
}

type Case = Readonly<{ label: string; schema: JsonSchema; references?: readonly JsonSchema[]; instances: readonly unknown[] }>;

const wide: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://x/a.schema.json", type: "object", required: ["name", "n"], additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 2, maxLength: 3, pattern: "^[a-z]+$" }, n: { type: "integer", minimum: 1, maximum: 5, exclusiveMinimum: 0, multipleOf: 2 }, e: { enum: ["a", "b"] }, c: { const: 1 },
    arr: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3, uniqueItems: true }, d: { type: "string", format: "date-time" }, u: { type: "string", format: "uri" },
    o: { oneOf: [{ type: "string" }, { type: "number" }] }, an: { anyOf: [{ type: "string" }, { type: "number" }] }, al: { allOf: [{ type: "string" }, { minLength: 9 }] }, nt: { not: { type: "string" } },
    r: { $ref: "b.schema.json" }, l: { $ref: "#/$defs/t" }, pn: { type: "object", propertyNames: { pattern: "^a" } }, mp: { type: "object", minProperties: 1, maxProperties: 1 },
    dr: { type: "object", dependentRequired: { x: ["y"] } }, pp: { type: "object", patternProperties: { "^s": { type: "string" } } }, ie: { if: { type: "string" }, then: { minLength: 5 }, else: { type: "number" } },
    pi: { type: "array", prefixItems: [{ type: "string" }], items: false }, ty: { type: ["string", "null"] }, em: { type: "string", format: "email" }, uu: { type: "string", format: "uuid" }, ip: { type: "string", format: "ipv4" }, dt: { type: "string", format: "date" },
  },
  $defs: { t: { type: "boolean" } },
};
const wideReference: JsonSchema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://x/b.schema.json", type: "number" };

const CASES: readonly Case[] = [
  { label: "wide keyword coverage", schema: wide, references: [wideReference], instances: [
    { name: "ABCD", n: 7, e: "z", c: 2, arr: ["a", "a"], d: "nope", u: "not a uri", o: "s", an: true, al: "x", nt: "s", r: "x", l: 1, pn: { b: 1 }, mp: {}, dr: { x: 1 }, pp: { s1: 2 }, ie: "ab", pi: ["a", "b"], ty: 1, extra: 1, em: "no", uu: "no", ip: "300.1.1.1", dt: "2024-02-30" },
    { name: "ab", n: 2, e: "a", c: 1, arr: ["a", "b"], d: "2024-02-29T12:00:00Z", u: "https://x/y", o: 1, an: "s", al: "abcdefghij", nt: 1, r: 1, l: true, pn: { a1: 1 }, mp: { a: 1 }, dr: { x: 1, y: 2 }, pp: { s1: "x" }, ie: "abcde", pi: ["a"], ty: null, em: "a@b.co", uu: "123e4567-e89b-12d3-a456-426614174000", ip: "10.0.0.1", dt: "2024-02-29" },
    {}, "not an object", { name: "ab", n: 2, o: 1.5 }, { name: "ab", n: 2, ie: 1 }, { name: "ab", n: 2, d: "2024-02-29 12:00:00+05:30", dt: "2023-02-29" },
  ] },
  { label: "two additional properties", schema: { type: "object", additionalProperties: false }, instances: [{ a: 1, b: 2 }, {}] },
  { label: "anyOf nested paths", schema: { properties: { x: { anyOf: [{ properties: { y: { type: "string" } } }, { required: ["z"] }] } } }, instances: [{ x: { y: 1 } }, { x: { y: "s" } }, { x: { z: 1, y: 2 } }] },
  { label: "oneOf none and both", schema: { oneOf: [{ type: "number" }, { type: "boolean" }] }, instances: ["s", 1, true] },
  { label: "oneOf overlapping", schema: { type: "object", properties: { o: { oneOf: [{ type: "number" }, { minimum: 0 }] } } }, instances: [{ o: 1 }, { o: "s" }, { o: -1 }] },
  { label: "urn reference", schema: { $ref: "urn:test:t" }, references: [{ $id: "urn:test:t", type: "string", minLength: 2 }], instances: ["x", "xy", 3] },
  { label: "embedded $id", schema: { $id: "https://h/root.json", properties: { a: { $ref: "sub.json" } }, $defs: { s: { $id: "https://h/sub.json", type: "string" } } }, instances: [{ a: 1 }, { a: "s" }] },
  { label: "$anchor", schema: { $id: "https://h/r.json", $ref: "#s", $defs: { s: { $anchor: "s", type: "string" } } }, instances: [1, "s"] },
  { label: "draft-07 tuple", schema: { $schema: DRAFT_07, items: [{ type: "string" }, { type: "string" }], additionalItems: false }, instances: [["a", 1, 2], ["a", "b"], ["a"]] },
  { label: "draft-07 tuple with additional schema", schema: { $schema: DRAFT_07, items: [{ type: "string" }], additionalItems: { type: "number" } }, instances: [["a", "b"], ["a", 1]] },
  { label: "draft-07 dependencies", schema: { $schema: DRAFT_07, dependencies: { x: ["y"], z: { required: ["w"] } } }, instances: [{ x: 1 }, { x: 1, y: 2 }, { z: 1 }, { z: 1, w: 1 }] },
  { label: "draft-07 definitions", schema: { $schema: DRAFT_07, $ref: "#/definitions/s", definitions: { s: { type: "string" } } }, instances: [1, "s"] },
  { label: "draft-07 fragment $id anchor", schema: { $schema: DRAFT_07, $ref: "#foo", definitions: { s: { $id: "#foo", type: "string" } } }, instances: [1, "s"] },
  { label: "contains", schema: { contains: { type: "string" } }, instances: [[1, 2], ["a", 1], []] },
  { label: "minContains maxContains", schema: { contains: { type: "string" }, minContains: 2, maxContains: 3 }, instances: [["a"], ["a", "b"], ["a", "b", "c", "d"]] },
  { label: "uniqueItems objects", schema: { uniqueItems: true }, instances: [[{ a: 1 }, { b: 1 }, { a: 1 }], [{ a: 1 }, { a: 1 }], [1, "1"], [[1], [1]], [{ a: 1, b: 2 }, { b: 2, a: 1 }]] },
  { label: "uniqueItems scalars declared", schema: { items: { type: "string" }, uniqueItems: true }, instances: [["a", "b", "a", "b"], ["a", "a"], ["a", "b"]] },
  { label: "uniqueItems scalars undeclared", schema: { uniqueItems: true }, instances: [["a", "b", "a"], ["a", "a"], [1, 1]] },
  { label: "code point length", schema: { minLength: 3, maxLength: 3 }, instances: ["😀😀", "😀😀😀", "😀😀😀😀", "abc"] },
  { label: "unevaluatedProperties", schema: { properties: { a: {} }, unevaluatedProperties: false }, instances: [{ a: 1, b: 2 }, { a: 1 }] },
  { label: "unevaluated via allOf", schema: { allOf: [{ properties: { a: {} } }], properties: { b: {} }, unevaluatedProperties: false }, instances: [{ a: 1, b: 2 }, { a: 1, b: 2, c: 3 }] },
  { label: "unevaluated via anyOf and if", schema: { anyOf: [{ properties: { a: { type: "string" } }, required: ["a"] }, { properties: { b: {} }, required: ["b"] }], if: { required: ["c"] }, then: { properties: { c: {} } }, unevaluatedProperties: false }, instances: [{ a: "s" }, { b: 1, c: 2 }, { a: "s", d: 1 }, { a: 1, b: 1 }] },
  { label: "unevaluatedProperties schema", schema: { properties: { a: {} }, unevaluatedProperties: { type: "number" } }, instances: [{ a: 1, b: "s" }, { a: 1, b: 2 }] },
  { label: "unevaluatedItems", schema: { prefixItems: [{}], unevaluatedItems: false }, instances: [[1, 2], [1]] },
  { label: "unevaluatedItems schema", schema: { prefixItems: [{}], unevaluatedItems: { type: "string" } }, instances: [[1, 2], [1, "s"]] },
  { label: "dependentSchemas", schema: { dependentSchemas: { x: { required: ["y"] } } }, instances: [{ x: 1 }, { x: 1, y: 1 }, {}] },
  { label: "exclusive bounds", schema: { exclusiveMaximum: 5, exclusiveMinimum: 1 }, instances: [5, 1, 3, "s"] },
  { label: "if without then", schema: { if: { type: "string" }, else: { type: "number" } }, instances: ["ab", 1, true] },
  { label: "else branch", schema: { if: { type: "string" }, then: { minLength: 5 }, else: { type: "boolean" } }, instances: [1, "abcde", "ab", true] },
  { label: "reference chain", schema: { $ref: "#/$defs/a", $defs: { a: { $ref: "#/$defs/b" }, b: { type: "string" } } }, instances: [1, "s"] },
  { label: "$ref siblings 2020", schema: { $ref: "#/$defs/a", maxLength: 2, $defs: { a: { type: "string" } } }, instances: ["abc", "ab", 1] },
  { label: "$ref siblings draft-07", schema: { $schema: DRAFT_07, $ref: "#/definitions/a", maxLength: 2, definitions: { a: { type: "string" } } }, instances: ["abc", "ab", 1] },
  { label: "unicode pattern", schema: { pattern: "^\\p{L}$" }, instances: ["é", "1"] },
  { label: "propertyNames several", schema: { propertyNames: { pattern: "^a" } }, instances: [{ b: 1, c: 2 }, { a: 1 }] },
  { label: "enum and const structures", schema: { properties: { e: { enum: [{ a: 1 }, [1, 2], null] }, c: { const: [1, 2] } } }, instances: [{ e: { a: 1 }, c: [1, 2] }, { e: { a: 1, b: 2 }, c: [2, 1] }, { e: null }] },
  { label: "type-specific keywords ignore other types", schema: { required: ["a"], items: { type: "number" }, minLength: 3, minimum: 10, format: "email", pattern: "^x" }, instances: ["s", 1, [1], { a: 1 }, null, true] },
  { label: "type lists", schema: { type: ["string", "null"] }, instances: [1, null, "s"] },
  { label: "integer", schema: { type: "integer" }, instances: [1.0, 2.5, "1"] },
  { label: "multipleOf", schema: { multipleOf: 0.5 }, instances: [1, 1.5, 1.25] },
  { label: "boolean schemas", schema: false, instances: [1] },
  { label: "true schema", schema: true, instances: [1, null] },
  { label: "tagged recursive tuples retain complete refusal diagnostics", schema: {
    $id: "https://h/tuple.json", anyOf: [
      { type: "array", prefixItems: [{ const: "leaf" }, { type: "string" }], minItems: 2, items: false },
      { type: "array", prefixItems: [{ const: "branch" }, { $ref: "#" }], minItems: 2, items: false },
    ],
  }, instances: [["leaf", "value"], ["branch", ["branch", ["leaf", "value"]]], ["unknown", false], ["branch", ["leaf", 4]]] },
  { label: "recursive", schema: { $id: "https://h/n.json", type: "object", properties: { a: { anyOf: [{ type: "string" }, { $ref: "#" }] } } }, instances: [{ a: { a: { a: "x" } } }, { a: { a: 1 } }] },
  { label: "$dynamicRef", schema: { $id: "https://h/d.json", $dynamicAnchor: "node", type: "object", properties: { items: { type: "array", items: { $dynamicRef: "#node" } } } }, instances: [{ items: [1] }, { items: [{ items: [] }] }] },
  { label: "nested instance paths", schema: { properties: { a: { properties: { b: { items: { properties: { c: { type: "string" } } } } } } } }, instances: [{ a: { b: [{ c: 1 }] } }] },
  { label: "escaped property names", schema: { properties: { "a/b": { type: "string" }, "c~d": { type: "string" } }, additionalProperties: false }, instances: [{ "a/b": 1, "c~d": 2 }] },
  { label: "patternProperties and additional", schema: { patternProperties: { "^s": { type: "string" } }, additionalProperties: { type: "number" } }, instances: [{ s1: 2, x: "s" }, { s1: "a", x: 1 }] },
  { label: "allOf collects every branch", schema: { allOf: [{ type: "string" }, { minLength: 3 }, { pattern: "^a" }] }, instances: [1, "b", "abc"] },
  { label: "not", schema: { not: { type: "string" } }, instances: ["s", 1] },
  { label: "unknown format is annotation", schema: { type: "string", format: "nope" }, instances: ["x"] },
  { label: "number formats", schema: { properties: { i: { format: "int32" }, l: { format: "int64" } } }, instances: [{ i: 2 ** 31, l: 1.5 }, { i: 1, l: 2 }] },
  { label: "invalid type keyword", schema: { type: "nope" }, instances: [1] },
  { label: "unresolvable reference", schema: { $ref: "nope.json" }, instances: [1] },
  { label: "unresolvable pointer", schema: { $ref: "#/$defs/missing", $defs: {} }, instances: [1] },
  { label: "unsupported dialect", schema: { $schema: "http://json-schema.org/draft-04/schema#" }, instances: [1] },
  { label: "reference dialect mismatch", schema: { $ref: "urn:x" }, references: [{ $id: "urn:x", $schema: DRAFT_07 }], instances: [1] },
  { label: "invalid nested schema value", schema: { properties: { a: { type: 5 } } }, instances: [1] },
  { label: "required not an array", schema: { required: "a" }, instances: [{}] },
];

function specificationSchemas(): readonly [string, JsonSchema][] {
  const directory = new URL("../specifications/", import.meta.url).pathname;
  return readdirSync(directory).filter((name) => name.endsWith(".schema.json")).map((name) => [name, JSON.parse(readFileSync(join(directory, name), "utf8")) as JsonSchema]);
}

test("the interpretive evaluator reproduces the previous evaluator on the keyword corpus", () => {
  for (const item of CASES) {
    const compiled = compileJsonSchema(item.schema, { references: item.references ?? [] });
    for (const instance of item.instances) {
      const expected = referenceValidate(instance, item.schema, item.references ?? []);
      const actual = compiled.validate(instance);
      assert.deepEqual({ valid: actual.valid, issues: [...actual.issues] }, expected, `${item.label}: ${JSON.stringify(instance)}`);
    }
  }
});

test("document admission agrees with the previous evaluator on validity and issue kind", () => {
  const documents: JsonSchema[] = [
    ...CASES.map((item) => item.schema),
    { $ref: "https://example.test/not-fetched", unevaluatedProperties: false }, { properties: { name: { type: "string", format: "email" } } }, { properties: { name: 3 } }, { type: "made-up" }, false,
    { minLength: -1 }, { enum: [] }, { required: "a" }, { properties: { a: { type: 5 } } }, { pattern: "(" }, { multipleOf: 0 }, { items: [] },
  ];
  for (const document of documents) {
    const expected = referenceValidateDocument(document);
    const actual = validateJsonSchemaDocument(document);
    assert.equal(actual.valid, expected.valid, JSON.stringify(document));
    assert.ok(actual.issues.every((entry) => entry.kind === "schema"));
  }
});

test("every shipped specification schema compiles under both evaluators and admits its own examples identically", () => {
  const shipped = specificationSchemas();
  const references = shipped.map(([, schema]) => schema);
  for (const [name, schema] of shipped) {
    const others = references.filter((candidate) => candidate !== schema);
    const compiled = compileJsonSchema(schema, { references: others });
    const examples = typeof schema === "object" && Array.isArray(schema["examples"]) ? (schema["examples"] as unknown[]) : [];
    for (const instance of [...examples, {}, null, "x", [], { kind: "wrong" }]) {
      const expected = referenceValidate(instance, schema, others);
      const actual = compiled.validate(instance);
      assert.deepEqual({ valid: actual.valid, issues: [...actual.issues] }, expected, `${name}: ${JSON.stringify(instance)}`);
    }
  }
});

test("a compiled evaluator is a snapshot: mutating the caller's schema afterwards changes nothing", () => {
  const schema = { type: "object", required: ["value"], properties: { value: { type: "integer" } } } as { properties: { value: { type: string } } };
  const reference = { $id: "urn:test:ref", type: "integer" } as { type: string };
  const compiled = compileJsonSchema({ $ref: "urn:test:ref" }, { references: [reference] });
  const direct = compileJsonSchema(schema);
  schema.properties.value.type = "string";
  reference.type = "string";
  assert.equal(direct.validate({ value: "text" }).valid, false);
  assert.equal(direct.validate({ value: 2 }).valid, true);
  assert.equal(compiled.validate("text").valid, false);
  assert.equal(compiled.validate(2).valid, true);
});
