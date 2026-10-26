import test from "node:test";
import assert from "node:assert/strict";
import { schemaReferenceIncidence } from "../src/articulation/predicating/positing/settling/site.mjs";

const ROOT = "https://example.test/schema/root.json";
const DRAFT_7 = "http://json-schema.org/draft-07/schema#";
const DRAFT_2020 = "https://json-schema.org/draft/2020-12/schema";
const contract = (id, schema, references = []) => ({ id, schema: { $id: id, ...schema }, references });
const at = (result, location) => result.references.find(row => row.location === location);

test("instance-data annotations cannot manufacture references or embedded resources", () => {
  const source = contract(ROOT, {
    const: { $id: "ghost.json", $ref: "not-a-schema.json" },
    enum: [{ $ref: "also-data.json" }],
    default: { $ref: "default-data.json" },
    examples: [{ $ref: "example-data.json" }],
    "x-data": { $ref: "extension-data.json" },
    properties: { actual: { $ref: "ghost.json" } },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(result.references.length, 1);
  assert.equal(result.references[0].location, "/properties/actual");
  assert.equal(result.references[0].resolved, false);
});

test("schema-bearing map, single and array keywords retain their real reference positions", () => {
  const schema = { $defs: { target: false } };
  for (const key of ["properties", "patternProperties", "dependentSchemas", "definitions"])
    schema[key] = { named: { $ref: "#/$defs/target" } };
  for (const key of ["items", "contains", "propertyNames", "not", "if", "then", "else", "additionalProperties", "unevaluatedItems", "unevaluatedProperties", "contentSchema"])
    schema[key] = { $ref: "#/$defs/target" };
  for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"])
    schema[key] = [{ $ref: "#/$defs/target" }];
  const result = schemaReferenceIncidence([contract(ROOT, schema)]);
  assert.equal(result.references.length, 19);
  assert.deepEqual(result.unresolved, []);
});

test("Draft 7 tuple items and schema dependencies are positions; property dependency names are data", () => {
  const result = schemaReferenceIncidence([contract(ROOT, {
    $schema: "http://json-schema.org/draft-07/schema#",
    definitions: { target: true },
    items: [{ $ref: "#/definitions/target" }],
    additionalItems: { $ref: "#/definitions/target" },
    dependencies: { typed: { $ref: "#/definitions/target" }, list: ["$ref", "not-a-schema"] },
  })]);
  assert.equal(result.references.length, 3);
  assert.deepEqual(result.unresolved, []);
});

test("Draft 7 does not interpret later keywords or anchors as schema declarations", () => {
  const source = contract(ROOT, {
    $schema: DRAFT_7,
    definitions: { target: true, annotation: { $anchor: "later", $dynamicAnchor: "dynamic" } },
    $defs: { unused: { $id: "ghost.json", $ref: "absent.json" } },
    dependentSchemas: { unused: { $ref: "absent.json" } },
    prefixItems: [{ $ref: "absent.json" }],
    unevaluatedItems: { $ref: "absent.json" },
    unevaluatedProperties: { $ref: "absent.json" },
    contentSchema: { $ref: "absent.json" },
    properties: { real: { $ref: "#/definitions/target" }, anchor: { $ref: "#later" }, dynamic: { $ref: "#dynamic" }, ghost: { $ref: "ghost.json" } },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(result.references.length, 4);
  assert.equal(at(result, "/properties/real").resolved, true);
  assert.deepEqual(result.unresolved.map(row => row.location), ["/properties/anchor", "/properties/dynamic", "/properties/ghost"]);
});

test("2020-12 does not interpret legacy applicators or tuple items as schema positions", () => {
  const source = contract(ROOT, {
    $schema: DRAFT_2020,
    definitions: { target: false },
    dependencies: { unused: { $ref: "absent.json" } },
    additionalItems: { $ref: "absent.json" },
    items: [{ $ref: "absent.json" }],
    properties: { real: { $ref: "#/definitions/target" } },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(result.references.length, 1);
  assert.deepEqual(result.unresolved, []);
});

test("Draft 7 reference siblings cannot change scope or emit additional edges", () => {
  const source = contract(ROOT, {
    $schema: DRAFT_7,
    definitions: { target: false },
    properties: { use: {
      $ref: "#/definitions/target", $id: "ignored.json",
      properties: { ignored: { $ref: "absent.json" } },
    } },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(result.references.length, 1);
  assert.equal(result.references[0].target, ROOT);
  assert.deepEqual(result.unresolved, []);
});

test("Draft 7 explicit pointers can still address sibling schema storage", () => {
  const source = contract(ROOT, {
    $schema: DRAFT_7, $ref: "#/definitions/target", definitions: { target: false },
    properties: { ignored: { $ref: "absent.json" } },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(result.references.length, 1);
  assert.deepEqual(result.unresolved, []);
});

test("embedded resources inherit their dialect and may declare another supported dialect", () => {
  const source = contract(ROOT, { $schema: DRAFT_2020, $defs: { old: {
    $id: "old.json", $schema: DRAFT_7,
    items: [{ $ref: "#" }], prefixItems: [{ $ref: "absent.json" }],
    definitions: {
      inherited: { $id: "inherited.json", items: [{ $ref: "#" }], prefixItems: [{ $ref: "absent.json" }] },
      modern: { $id: "modern.json", $schema: DRAFT_2020, prefixItems: [{ $ref: "#" }], additionalItems: { $ref: "absent.json" } },
    },
  } } });
  const result = schemaReferenceIncidence([source]);
  assert.deepEqual(result.references.map(row => row.location), [
    "/$defs/old/definitions/inherited/items/0",
    "/$defs/old/definitions/modern/prefixItems/0",
    "/$defs/old/items/0",
  ]);
  assert.deepEqual(result.unresolved, []);
});

test("unsupported or misplaced dialect declarations do not silently select a vocabulary", () => {
  assert.throws(() => schemaReferenceIncidence([contract(ROOT, { $schema: "https://example.test/custom-dialect" })]), /unsupported.*dialect/i);
  assert.throws(() => schemaReferenceIncidence([contract(ROOT, { properties: { invalid: { $schema: DRAFT_7 } } })]), /dialect.*resource root/i);
  assert.deepEqual(schemaReferenceIncidence([contract(ROOT, { const: { $schema: "https://example.test/custom-dialect" } })]).references, []);
});

test("Draft 7 plain-name ids are anchors while 2020-12 nonempty id fragments refuse", () => {
  const source = contract(ROOT, {
    $schema: DRAFT_7,
    definitions: { target: { $id: "#legacy:name", type: "string" } },
    properties: { use: { $ref: "#legacy:name" } },
  });
  assert.deepEqual(schemaReferenceIncidence([source]).unresolved, []);
  assert.throws(() => schemaReferenceIncidence([contract(ROOT, { $schema: DRAFT_2020, $id: `${ROOT}#forbidden` })]), /nonempty.*fragment/i);
  assert.throws(() => schemaReferenceIncidence([contract(ROOT, { $schema: DRAFT_7, definitions: { invalid: { $id: "child.json#undefined" } } })]), /unsupported.*fragment/i);
  assert.deepEqual(schemaReferenceIncidence([contract(ROOT, { $schema: DRAFT_2020, $id: `${ROOT}#`, $ref: "#" })]).unresolved, []);
});

test("RFC 6901 escapes and percent encoding resolve actual nested schemas including false", () => {
  const source = contract(ROOT, {
    $defs: { "a/b": { properties: { "c~d": false } }, "~1": true, "with space": true },
    properties: {
      first: { $ref: "#/$defs/a~1b/properties/c~0d" },
      second: { $ref: "#/$defs/~01" },
      third: { $ref: "#/$defs/with%20space" },
      malformed: { $ref: "#/$defs/a~2b" },
      malformedPercent: { $ref: "#/$defs/%XX" },
    },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(at(result, "/properties/first").resolved, true);
  assert.equal(at(result, "/properties/second").resolved, true);
  assert.equal(at(result, "/properties/third").resolved, true);
  assert.deepEqual(result.unresolved.map(row => row.location), ["/properties/malformed", "/properties/malformedPercent"]);
});

test("prototype names resolve only as owned schema members", () => {
  const source = contract(ROOT, {
    $defs: JSON.parse('{"__proto__":false}'),
    properties: { yes: { $ref: "#/$defs/__proto__" }, no: { $ref: "#/$defs/toString" } },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(at(result, "/properties/yes").resolved, true);
  assert.equal(at(result, "/properties/no").resolved, false);
});

test("a pointer into data, a schema map or a scalar is not a schema target", () => {
  const source = contract(ROOT, {
    const: { type: "string" }, $defs: { okay: true }, type: "object",
    properties: { data: { $ref: "#/const" }, map: { $ref: "#/$defs" }, scalar: { $ref: "#/type" } },
  });
  assert.equal(schemaReferenceIncidence([source]).unresolved.length, 3);
});

test("an embedded resource resets local pointer and anchor scope", () => {
  const source = contract(ROOT, {
    $defs: { parentOnly: true, nested: {
      $id: "child.json", $defs: { local: false, anchored: { $anchor: "inside", type: "string" } },
      properties: { local: { $ref: "#/$defs/local" }, absent: { $ref: "#/$defs/parentOnly" }, anchor: { $ref: "#inside" } },
    } },
    properties: { outer: { $ref: "child.json#inside" } },
  });
  const result = schemaReferenceIncidence([source]);
  const local = at(result, "/$defs/nested/properties/local");
  assert.equal(local.target, "https://example.test/schema/child.json");
  assert.equal(local.resolved, true);
  assert.equal(at(result, "/$defs/nested/properties/absent").resolved, false);
  assert.equal(at(result, "/$defs/nested/properties/anchor").resolved, true);
  assert.equal(at(result, "/properties/outer").resolved, true);
});

test("only explicitly composed external contracts can resolve relative document and fragment references", () => {
  const target = contract("https://example.test/types/target.json", { $defs: { answer: false } });
  const schema = { properties: { yes: { $ref: "../types/target.json#/$defs/answer" }, no: { $ref: "../types/target.json#/$defs/missing" } } };
  const source = contract(ROOT, schema, [target]);
  const result = schemaReferenceIncidence([source, target]);
  assert.equal(at(result, "/properties/yes").resolved, true);
  assert.equal(at(result, "/properties/yes").target, target.id);
  assert.equal(at(result, "/properties/no").resolved, false);
  const uncomposed = schemaReferenceIncidence([contract(ROOT, schema), target]);
  assert.equal(uncomposed.unresolved.length, 2);
});

test("references to the current resource may use empty or explicit URI spelling", () => {
  const source = contract(ROOT, { properties: { empty: { $ref: "" }, absolute: { $ref: ROOT }, fragment: { $ref: "#" } } });
  const result = schemaReferenceIncidence([source]);
  assert.deepEqual(result.unresolved, []);
  assert.equal(at(result, "/properties/empty").scope, "local");
  assert.equal(at(result, "/properties/absolute").scope, "external");
});

test("absolute resource identifiers retain their explicit spelling", () => {
  const id = "https://example.test";
  const source = contract(id, { $ref: id });
  assert.equal(schemaReferenceIncidence([source]).references[0].target, id);
  assert.deepEqual(schemaReferenceIncidence([source]).unresolved, []);
});

test("static references may name dynamic anchors and only anchors in schema positions", () => {
  const source = contract(ROOT, {
    $defs: { recursive: { $dynamicAnchor: "recursive", type: "object" } },
    const: { $anchor: "example" },
    properties: { yes: { $ref: "#recursive" }, no: { $ref: "#example" }, missing: { $ref: "#absent" } },
  });
  const result = schemaReferenceIncidence([source]);
  assert.equal(at(result, "/properties/yes").resolved, true);
  assert.equal(at(result, "/properties/no").resolved, false);
  assert.equal(at(result, "/properties/missing").resolved, false);
});

test("explicitly carried embedded resources resolve without requiring an ambient top-level copy", () => {
  const target = contract("https://example.test/external/root.json", {
    $defs: { nested: { $id: "child.json", $anchor: "child", type: "string" } },
  });
  const source = contract(ROOT, { $ref: "../external/child.json#child" }, [target]);
  const result = schemaReferenceIncidence([source]);
  assert.equal(result.references[0].target, "https://example.test/external/child.json");
  assert.deepEqual(result.unresolved, []);
});

test("conflicting anchors and explicitly composed resource identities refuse ambiguity", () => {
  const anchors = contract(ROOT, { $defs: { a: { $anchor: "same", type: "string" }, b: { $anchor: "same", type: "number" } } });
  assert.throws(() => schemaReferenceIncidence([anchors]), /different schemas.*address/i);
  const id = "https://example.test/shared.json";
  const source = contract(ROOT, { $ref: id }, [contract(id, { type: "string" }), contract(id, { type: "number" })]);
  assert.throws(() => schemaReferenceIncidence([source]), /different schemas.*address/i);
});

test("reference source locations escape authored property names", () => {
  const source = contract(ROOT, { properties: { "a/b~c": { $ref: "#" } } });
  assert.equal(schemaReferenceIncidence([source]).references[0].location, "/properties/a~1b~0c");
});

test("conflicting identities refuse and identical embedded resources may be reused", () => {
  assert.throws(() => schemaReferenceIncidence([contract(ROOT, {}), contract(ROOT, {})]), /duplicate.*contract/i);
  const bad = contract(ROOT, { $defs: { a: { $id: "child.json", type: "number" }, b: { $id: "child.json", type: "string" } } });
  assert.throws(() => schemaReferenceIncidence([bad]), /different schemas.*address/i);
  const shared = contract(ROOT, { $defs: { a: { $id: "child.json", type: "string" }, b: { type: "string", $id: "child.json" } }, $ref: "child.json" });
  assert.deepEqual(schemaReferenceIncidence([shared]).unresolved, []);
});

test("source admission refuses cycles and accessors without invoking them", () => {
  let calls = 0;
  const getter = {}; Object.defineProperty(getter, "$ref", { enumerable: true, get() { calls++; return "#"; } });
  assert.throws(() => schemaReferenceIncidence([{ id: ROOT, schema: getter, references: [] }]), /accessor/);
  assert.equal(calls, 0);
  const cycle = {}; cycle.properties = { self: cycle };
  assert.throws(() => schemaReferenceIncidence([{ id: ROOT, schema: cycle, references: [] }]), /cycle/);
});

test("canonical output is locale-independent, frozen, and leaves source data unchanged", () => {
  const sources = [contract("é", { $ref: "#" }), contract("z", { $ref: "#" }), contract("🦉", { $ref: "#" })];
  const before = JSON.stringify(sources), original = String.prototype.localeCompare;
  try {
    String.prototype.localeCompare = () => { throw new Error("ambient locale was consulted"); };
    const result = schemaReferenceIncidence(sources);
    assert.deepEqual(result.schemas, ["z", "é", "🦉"]);
    assert.deepEqual(result.references.map(row => row.from), result.schemas);
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.references) && Object.isFrozen(result.references[0]));
  } finally { String.prototype.localeCompare = original; }
  assert.equal(JSON.stringify(sources), before);
});

test("a false root contract is a schema resource and can be explicitly referenced", () => {
  const target = { id: "house/false", schema: false, references: [] };
  const source = contract("house/source", { $ref: target.id }, [target]);
  const result = schemaReferenceIncidence([source, target]);
  assert.deepEqual(result.unresolved, []);
});
