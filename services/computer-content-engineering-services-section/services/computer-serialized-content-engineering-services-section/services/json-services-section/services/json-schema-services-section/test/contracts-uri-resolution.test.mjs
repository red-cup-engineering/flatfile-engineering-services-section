import assert from "node:assert/strict";
import test from "node:test";
import { schemaFrom, schemaFromGraph, schemaById } from "../src/contracts.mjs";

const graph = (root, ...references) => schemaFromGraph({ root: root.$id, schemas: [root, ...references].map(schema => ({ id: schema.$id, schema })) });

for (const [name, id, reference, target] of [
  ["public sibling", "https://schemas.561.group/test/root.schema.json", "child.schema.json", "https://schemas.561.group/test/child.schema.json"],
  ["public parent", "https://schemas.561.group/test/branch/root.schema.json", "../child.schema.json", "https://schemas.561.group/test/child.schema.json"],
  ["public root-relative", "https://schemas.561.group/test/branch/root.schema.json", "/child.schema.json", "https://schemas.561.group/child.schema.json"],
  ["bare sibling", "test/branch/root", "child", "test/branch/child"],
  ["bare parent", "test/branch/root", "../child", "test/child"],
  ["bare exact", "test/branch/root", "house/child", "house/child"],
  ["absolute URN", "urn:test:root", "urn:test:child", "urn:test:child"],
]) test(`closed contracts resolve ${name} without changing public carriers`, () => {
  const root = { $id: id, type: "object", required: ["value"], properties: { value: { $ref: reference } } };
  const child = { $id: target, type: "string" };
  const before = structuredClone([root, child]);
  const contract = graph(root, child);
  assert.equal(contract.validate({ value: "text" }), true);
  assert.equal(contract.validate({ value: 42 }), false);
  assert.deepEqual(contract.schema, root);
  assert.deepEqual([root, child], before);
  assert.equal(contract.references[0].id, target);
});

for (const ref of ["nested/branch.json", "https://schemas.561.group/test/nested/branch.json", "#/$defs/branch"]) {
  test(`public nested resources resolve through ${ref}`, () => {
    const root = { $id: "https://schemas.561.group/test/root.json", $ref: ref, $defs: {
      branch: { $id: "nested/branch.json", type: "object", required: ["value", "local"], properties: {
        value: { $ref: "../child.json#text" }, local: { $ref: "#/$defs/local" },
      }, $defs: { local: { const: "local" } } },
    } };
    const child = { $id: "https://schemas.561.group/test/child.json", $defs: { text: { $anchor: "text", type: "string" } } };
    const contract = graph(root, child);
    assert.equal(contract.validate({ value: "text", local: "local" }), true);
    assert.equal(contract.validate({ value: 42, local: "local" }), false);
    assert.equal(contract.validate({ value: "text", local: "wrong" }), false);
  });
}

for (const fragment of ["#text", "#/$defs/text", "#/$defs/a~1b"]) test(`public relative target retains fragment ${fragment}`, () => {
  const root = { $id: "https://schemas.561.group/fragments/root.json", $ref: `child.json${fragment}` };
  const child = { $id: "https://schemas.561.group/fragments/child.json", $defs: { text: { $anchor: "text", type: "string" }, "a/b": { type: "string" } } };
  assert.equal(graph(root, child).validate("text"), true);
  assert.equal(graph(root, child).validate(1), false);
});

test("repeated identical nested resources retain their descendant scopes", () => {
  const branch = { $id: "nested/branch.json", $defs: { value: { $id: "value.json", type: "string" } }, $ref: "value.json" };
  const root = { $id: "https://schemas.561.group/repeated/root.json", allOf: [branch, structuredClone(branch)] };
  assert.equal(graph(root).validate("text"), true);
  assert.equal(graph(root).validate(1), false);
});

test("conflicting nested resource IDs refuse regardless of traversal order", () => {
  for (const entries of [[{ $id: "same.json", type: "string" }, { $id: "same.json", type: "number" }], [{ $id: "same.json", type: "number" }, { $id: "same.json", type: "string" }]]) {
    assert.throws(() => graph({ $id: "https://schemas.561.group/conflict/root.json", allOf: entries }), /Invalid schema graph/);
  }
});

for (const nestedId of ["child.json", "https://schemas.561.group/collision/child.json"]) test(`conflicting nested and supplied resource refuse: ${nestedId}`, () => {
  const child = { $id: "https://schemas.561.group/collision/child.json", type: "number" };
  const root = { $id: "https://schemas.561.group/collision/root.json", $defs: { child: { $id: nestedId, type: "string" } }, $ref: "child.json" };
  assert.throws(() => graph(root, child), /Invalid schema graph/);
});

test("missing public targets and fragments never consult registry or fetch", () => {
  const id = "https://schemas.561.group/closed/child.json";
  schemaFrom({ $id: id, type: "string" });
  const registry = schemaById(id);
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls++; throw Error("network forbidden"); };
  try {
    const root = { $id: "https://schemas.561.group/closed/root.json", $ref: "child.json" };
    assert.throws(() => graph(root), /Invalid schema graph/);
    assert.throws(() => graph({ ...root, $ref: "child.json#missing" }, { $id: id, type: "string" }), /Invalid schema graph/);
    assert.throws(() => graph(root, { $id: id, type: "string" }, { $id: id, type: "number" }), /Invalid schema graph/);
    assert.equal(graph(root, { $id: id, type: "number" }).validate(4), true);
    assert.equal(fetchCalls, 0);
    assert.equal(schemaById(id), registry);
    assert.equal(schemaById(root.$id), undefined);
  } finally { globalThis.fetch = originalFetch; }
});


test("a bare compatibility alias cannot shadow a different URI-relative target", () => {
  const root = { $id: "https://schemas.561.group/ambiguous/root.json", $ref: "child.json" };
  const relative = { $id: "https://schemas.561.group/ambiguous/child.json", type: "string" };
  const alias = { $id: "child.json", type: "number" };
  assert.throws(() => graph(root, relative, alias), /Invalid schema graph/);
});

test("private bare-ID projections cannot collide with a supplied public resource", () => {
  const root = { $id: "test/private", type: "string" };
  const collision = { $id: "https://schemas.computer-data.invalid/test%2Fprivate/", type: "number" };
  assert.throws(() => graph(root, collision), /Invalid schema graph/);
});

test("an identical embedded and supplied resource retains its meaning", () => {
  const child = { $id: "https://schemas.561.group/identical/child.json", type: "string" };
  const root = { $id: "https://schemas.561.group/identical/root.json", allOf: [{ ...child, $id: "child.json" }, { $ref: "child.json" }] };
  assert.equal(graph(root, child).validate("text"), true);
  assert.equal(graph(root, child).validate(3), false);
});


test("conflicting anchors in one resource refuse while distinct resource scopes remain separate", () => {
  const root = { $id: "https://schemas.561.group/anchors/root.json", $defs: { a: { $anchor: "same", type: "string" }, b: { $anchor: "same", type: "number" } }, $ref: "#same" };
  assert.throws(() => graph(root), /Invalid schema graph/);
  const distinct = { ...root, $defs: { ...root.$defs, b: { ...root.$defs.b, $id: "other.json" } } };
  assert.equal(graph(distinct).validate("text"), true);
  assert.equal(graph(distinct).validate(3), false);
});


for (const reverse of [false, true]) test(`nested public IDs cannot claim a bare owner's private address (reverse=${reverse})`, () => {
  const child = { $id: "house/child", type: "number" };
  const root = { $id: "https://schemas.561.group/private-collision/root.json", $ref: child.$id, $defs: {
    shadow: { $id: "https://schemas.computer-data.invalid/house%2Fchild/", type: "string" },
  } };
  const members = reverse ? [child, root] : [root, child];
  for (const selected of members) assert.throws(() => schemaFromGraph({ root: selected.$id, schemas: members.map(schema => ({ id: schema.$id, schema })) }), /Invalid schema graph/);
});


for (const reverse of [false, true]) test(`fragment $id and anchor aliases share one conflict gate (reverse=${reverse})`, () => {
  const entries = [{ $id: "#same", type: "string" }, { $anchor: "same", type: "number" }];
  if (reverse) entries.reverse();
  const root = { $id: "https://schemas.561.group/fragment-alias/root.json", $defs: Object.fromEntries(entries.map((schema, i) => [String(i), schema])), $ref: "#same" };
  assert.throws(() => graph(root), /Invalid schema graph/);
});
