import assert from "node:assert/strict";
import test from "node:test";
import { validateSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validate-schema-instance";
import { resolveSchemaPointer } from "@red-cup-engineering/json-schema-services-section/resolve-schema-pointer";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";

// Draft 2020-12: $ref has adjacent constraints, and string length counts characters.
// https://json-schema.org/draft/2020-12/json-schema-core#section-8.2.3.1
// https://json-schema.org/draft/2020-12/json-schema-validation#section-6.3.1
// https://json-schema.org/draft/2020-12/json-schema-validation#section-6.3.2
// These focused regressions do not claim full dialect or RFC conformance.
const refSchema = { $defs: { text: { type: "string" } }, $ref: "#/$defs/text", minLength: 2 };
const cases = [
  ["reference siblings reject too-short text", "x", refSchema, false],
  ["reference siblings admit matching text", "xx", refSchema, true],
  ["referenced constraints still apply", 2, refSchema, false],
  ["meta-schema reference retains adjacent type constraint", false, { $ref: "https://json-schema.org/draft/2020-12/schema", type: "object" }, false],
  ["meta-schema reference admits a matching schema object", { type: "string" }, { $ref: "https://json-schema.org/draft/2020-12/schema", type: "object" }, true],
  ["meta-schema reference applies sibling to a schema-valued instance", { type: "string" }, { $ref: "https://json-schema.org/draft/2020-12/schema", maxProperties: 0 }, false],
  ["unresolved reference retains refusal", "x", { $ref: "urn:test:absent-schema" }, false],
  ["cyclic reference terminates and retains sibling constraint", "x", { $ref: "#", type: "string", minLength: 2 }, false],
  ["self reference admits matching siblings", "xx", { $ref: "#", type: "string", minLength: 2 }, true],
  ["two-node cycle enforces first node siblings", "x", { $defs: { a: { $ref: "#/$defs/b", type: "string", minLength: 2 }, b: { $ref: "#/$defs/a", maxLength: 3 } }, $ref: "#/$defs/a" }, false],
  ["two-node cycle enforces repeated-edge node siblings", "xxxx", { $defs: { a: { $ref: "#/$defs/b", type: "string", minLength: 2 }, b: { $ref: "#/$defs/a", maxLength: 3 } }, $ref: "#/$defs/a" }, false],
  ["two-node cycle admits matching siblings", "xx", { $defs: { a: { $ref: "#/$defs/b", type: "string", minLength: 2 }, b: { $ref: "#/$defs/a", maxLength: 3 } }, $ref: "#/$defs/a" }, true],
  ["one astral scalar fails minimum two", "😀", { type: "string", minLength: 2 }, false],
  ["one astral scalar meets maximum one", "😀", { type: "string", maxLength: 1 }, true],
  ["two astral scalars meet length two", "😀🙂", { type: "string", minLength: 2, maxLength: 2 }, true],
  ["ZWJ sequence counts three code points", "👩‍🔬", { type: "string", minLength: 3, maxLength: 3 }, true],
  ["ZWJ sequence is not one grapheme-length character", "👩‍🔬", { type: "string", maxLength: 1 }, false],
  ["combining sequence counts two characters", "e\u0301", { type: "string", minLength: 2, maxLength: 2 }, true],
  ["combining sequence is not one grapheme-length character", "e\u0301", { type: "string", maxLength: 1 }, false],
  ["precomposed scalar is not normalized to two", "é", { type: "string", minLength: 2 }, false],
  ["ordinary BMP scalar keeps maximum one", "x", { type: "string", maxLength: 1 }, true],
];
for (const [name, instance, schema, ok] of cases) test(name, () => {
  const before = JSON.stringify({ instance, schema });
  const result = validateSchemaInstance({ instance, schema });
  assert.deepEqual(Object.keys(result), ["ok", "errors"]);
  assert.equal(result.ok, ok);
  assert.equal(result.errors.length === 0, ok);
  for (const error of result.errors) assert.deepEqual(Object.keys(error), ["pointer", "keyword", "message"]);
  assert.equal(JSON.stringify({ instance, schema }), before);
});

test("dense admitted arrays cannot expose private inherited indices", () => {
  const arrayPrototype = Object.getOwnPropertyDescriptors(Array.prototype);
  const objectPrototype = Object.getOwnPropertyDescriptors(Object.prototype);
  const document = ["own"];
  const privatePrototype = Object.create(Array.prototype);
  Object.defineProperty(privatePrototype, "1", { value: "inherited", enumerable: true, writable: true, configurable: true });
  Object.setPrototypeOf(document, privatePrototype);
  assert.doesNotThrow(() => requireJsonValue(document));
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/1" }), { found: false });
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/0" }), { found: true, value: "own" });
  assert.equal(document.length, 1);
  assert.deepEqual(Object.keys(document), ["0"]);
  assert.equal(Object.getPrototypeOf(document), privatePrototype);
  assert.equal(privatePrototype[1], "inherited");
  assert.deepEqual(Object.getOwnPropertyDescriptors(Array.prototype), arrayPrototype);
  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), objectPrototype);
});

test("schema pointers retain own special object keys", () => {
  const document = JSON.parse('{"__proto__":{"kept":true},"01":"numeric object key","~1":"escaped","length":"declared length key","0":"object zero","$defs":{"item":false}}');
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/__proto__" }), { found: true, value: { kept: true } });
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/01" }), { found: true, value: "numeric object key" });
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/length" }), { found: true, value: "declared length key" });
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/0" }), { found: true, value: "object zero" });
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/$defs/item" }), { found: true, value: false });
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/~01" }), { found: true, value: "escaped" });
  assert.deepEqual(resolveSchemaPointer({ document: {}, pointer: "/__proto__" }), { found: false });
});

test("schema pointers retain canonical-index and escape refusals", () => {
  for (const token of ["01", "-1", "+0", "1.0", "length", "-", "1", "~2"]) {
    assert.deepEqual(resolveSchemaPointer({ document: ["own"], pointer: `/${token}` }), { found: false });
  }
  assert.deepEqual(resolveSchemaPointer({ document: ["own"], pointer: "/0" }), { found: true, value: "own" });
});

test("array pointer bounds exclude own non-index numeric properties", () => {
  const document = ["own"];
  Object.defineProperty(document, "4294967295", { value: "outside length", enumerable: true });
  assert.doesNotThrow(() => requireJsonValue(document));
  assert.equal(document.length, 1);
  assert.deepEqual(resolveSchemaPointer({ document, pointer: "/4294967295" }), { found: false });
  assert.deepEqual(resolveSchemaPointer({ document: { "4294967295": "ordinary key" }, pointer: "/4294967295" }), { found: true, value: "ordinary key" });
});
