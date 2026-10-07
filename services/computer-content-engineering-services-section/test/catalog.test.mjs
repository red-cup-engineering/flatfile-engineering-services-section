import assert from "node:assert/strict";
import test from "node:test";
import {
  CATALOG_PROFILE,
  auditCatalog,
  classifyResource,
  compileCatalog,
} from "../src/catalog.mjs";
import { receiptSen, decodeReceiptSen } from "../src/receipt-sen.mjs";

const catalog = {
  profile: CATALOG_PROFILE,
  imports: ["urn:schema:external"],
  nodes: [
    { type: "resource", parent: null, recognize: { op: "true" }, corner: "bottom", rung: "strict" },
    {
      type: "source", parent: "resource", corner: "prose", rung: "strict",
      recognize: { op: "content-includes", value: "apex:obsmetrologia/articulating" },
      schema: { $id: "urn:schema:source", type: "object", properties: { peer: { $ref: "urn:schema:external" } } },
    },
    {
      type: "lean-reading", parent: "source", corner: "assertion", rung: "scott",
      recognize: { op: "content-includes", value: "inductive Articulating where" },
    },
    {
      type: "solidity-reading", parent: "source", corner: "assertion", rung: "strict",
      recognize: { op: "content-includes", value: "contract Articulating" },
    },
  ],
};

// The addressed-classification case (addressRoot + options.writing) moved to
// typed-resource-catalog-actions/test/addressed-classification.test.mjs: it
// needs the agent-organization-engine writing module, which classifyResource
// takes only as an explicit caller-supplied dependency, never an ambient
// import from this substrate package.

test("equal-depth incomparable recognizers remain ambiguous", () => {
  const ambiguous = structuredClone(catalog);
  ambiguous.nodes.push({
    type: "another-lean-reading", parent: "source", corner: "assertion", rung: "strict",
    recognize: { op: "content-includes", value: "inductive Articulating where" },
  });
  const receipt = classifyResource(compileCatalog(ambiguous), {
    path: "/x", content: "apex:obsmetrologia/articulating inductive Articulating where",
  });
  assert.equal(receipt.disposition, "ambiguous");
  assert.deepEqual(receipt.candidates, ["another-lean-reading", "lean-reading"]);
  assert.deepEqual(receipt.proofPath, []);
});

test("closed mode refuses unresolved schema references", () => {
  const open = structuredClone(catalog);
  open.imports = [];
  const audit = auditCatalog(open);
  assert.equal(audit.closed, false);
  assert.deepEqual(audit.obligations, [{ kind: "unresolved-schema-reference", type: "source", ref: "urn:schema:external" }]);
  assert.throws(() => compileCatalog(open, { closed: true }), /catalog is not closed.*unresolved-schema-reference/u);
});

test("classification receipt has a reversible typed SEN face", () => {
  const receipt = classifyResource(compileCatalog(catalog), { path: "/x", content: "nothing" });
  const projected = receiptSen(receipt);
  assert.equal(projected.mediaType, "application/sen+cbor");
  assert.deepEqual(decodeReceiptSen(projected.bytes), receipt);
});

test("equal bytes at different proof paths remain distinct resources", () => {
  const compiled = compileCatalog(catalog);
  const content = "apex:obsmetrologia/articulating inductive Articulating where";
  const local = classifyResource(compiled, { path: "/tmp/one/Articulating.lean", content });
  const cloud = classifyResource(compiled, { path: "repo://info/obsmetrologia/Articulating.lean", content });
  assert.notEqual(local.resource, cloud.resource);
  assert.notEqual(local.id, cloud.id);
  assert.equal(local.contentIdentity, cloud.contentIdentity);
  assert.equal(local.resourcePath, "/tmp/one/Articulating.lean");
  assert.equal(cloud.resourcePath, "repo://info/obsmetrologia/Articulating.lean");
});

test("resource and catalog inputs are deliberately bounded", () => {
  assert.throws(
    () => classifyResource(compileCatalog(catalog), { path: "repo://too-large", content: "x".repeat(1_048_577) }),
    /resource.content exceeds 1048576 UTF-8 bytes/u,
  );
  const oversized = structuredClone(catalog);
  oversized.nodes = Array.from({ length: 257 }, (_, index) => ({ type: `resource-${index}`, parent: null, recognize: { op: "true" } }));
  assert.throws(() => compileCatalog(oversized), /catalog.nodes must contain 1 to 256 nodes/u);
});

test("json-schema recognition uses the shared validator and witnesses its condition", () => {
  const declared = {
    profile: CATALOG_PROFILE,
    nodes: [
      { type: "resource", parent: null, recognize: { op: "true" } },
      { type: "model", parent: "resource", recognize: { op: "json-schema", schema: { type: "object", required: ["kind"], properties: { kind: { const: "articulating" } } } } },
    ],
  };
  const compiled = compileCatalog(declared, { closed: true });
  const valid = classifyResource(compiled, { path: "resource.json", content: '{"kind":"articulating"}' });
  assert.equal(valid.classification, "model");
  assert.equal(valid.proofPath[1].schemaConditions.length, 1);
  assert.equal(classifyResource(compiled, { path: "resource.json", content: '{"kind":"other"}' }).classification, "resource");
  assert.equal(classifyResource(compiled, { path: "resource.json", content: "not-json" }).classification, "resource");
});

test("json-schema declarations refuse malformed and unresolved graphs while false is a valid nonmatch", () => {
  const base = { profile: CATALOG_PROFILE, nodes: [{ type: "resource", parent: null, recognize: { op: "json-schema", schema: false } }] };
  assert.equal(classifyResource(compileCatalog(base), { path: "x", content: "null" }).disposition, "unclassified");
  const malformed = structuredClone(base);
  malformed.nodes[0].recognize.schema = { $schema: "https://example.invalid/schema" };
  assert.throws(() => compileCatalog(malformed), /json-schema declaration is invalid/u);
  const unresolved = structuredClone(base);
  unresolved.nodes[0].recognize.schema = { $ref: "urn:missing" };
  assert.throws(() => compileCatalog(unresolved), /json-schema declaration is invalid/u);
});

test("json-schema recognition composes declared references under the validator policy", () => {
  const declared = {
    profile: CATALOG_PROFILE,
    nodes: [{ type: "referenced", parent: null, recognize: {
      op: "json-schema", schema: { $ref: "urn:trc:shape" },
      schemas: [{ $id: "urn:trc:shape", type: "object", properties: { count: { type: "integer" } }, required: ["count"], unsupportedHouseKeyword: true }],
    }}],
  };
  const compiled = compileCatalog(declared);
  assert.equal(classifyResource(compiled, { path: "x", content: '{"count":2}' }).classification, "referenced");
  assert.equal(classifyResource(compiled, { path: "x", content: '{"count":"2"}' }).disposition, "unclassified");
});

test("compiled catalog identity binds immutable recognition and node evidence", () => {
  const declaration = { profile: CATALOG_PROFILE, nodes: [{ type: "value", parent: null, recognize: { op: "json-schema", schema: { type: "string" } } }] };
  const compiled = compileCatalog(declaration);
  const resource = { path: "x", content: "1" };
  assert.equal(classifyResource(compiled, resource).disposition, "unclassified");
  declaration.nodes[0].recognize.schema.type = "number";
  compiled.nodes.set("value", { type: "value", parent: null, recognize: { op: "true" } });
  assert.equal(classifyResource(compiled, resource).disposition, "unclassified");
  assert.equal(compiled.declaration.nodes[0].recognize.schema.type, "string");
});
