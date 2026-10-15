import assert from "node:assert/strict";
import test from "node:test";
import { schemaFromGraph } from "../src/contracts.mjs";
import { compileJsonSchema } from "../src/validation.mjs";

const schemaFailure = (schema, references = []) => {
  const result = compileJsonSchema(schema, { references }).validate("text");
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.kind === "schema" && issue.message.includes("different schemas share reference address")));
};

test("the evaluator itself refuses conflicting document claims in either order", () => {
  const id = "https://schemas.561.group/owner/document.json";
  for (const [left, right] of [["string", "number"], ["number", "string"]]) schemaFailure({ $id: id, type: left }, [{ $id: id, type: right }]);
});

test("the evaluator itself refuses nested/root address aliases in either order", () => {
  const id = "https://schemas.computer-data.invalid/house%2Fchild/";
  const root = { $id: "https://schemas.561.group/root.json", $defs: { shadow: { $id: id, type: "string" } }, $ref: id };
  const child = { $id: id, type: "number" };
  schemaFailure(root, [child]);
  schemaFailure(child, [root]);
});

test("the evaluator's resource fragment and anchor aliases share registration", () => {
  for (const reverse of [false, true]) {
    const members = [{ $id: "#same", type: "string" }, { $anchor: "same", type: "number" }];
    if (reverse) members.reverse();
    schemaFailure({ $id: "https://schemas.561.group/root.json", $defs: Object.fromEntries(members.map((schema, i) => [String(i), schema])), $ref: "#same" });
  }
});

test("identical resource claims and distinct anchor scopes remain valid", () => {
  const root = { $id: "https://schemas.561.group/root.json", type: "string" };
  assert.equal(compileJsonSchema(root, { references: [structuredClone(root)] }).validate("text").valid, true);
  const schema = { $id: root.$id, $defs: { a: { $anchor: "value", type: "string" }, b: { $id: "other.json", $anchor: "value", type: "number" } }, $ref: "#value" };
  const validator = compileJsonSchema(schema);
  assert.equal(validator.validate("text").valid, true);
  assert.equal(validator.validate(3).valid, false);
});


for (const keyword of ["x-note", "x-notes", "default", "examples", "contentSchema"]) test(`schema-looking ${keyword} annotation cannot claim resources or references`, () => {
  const id = `urn:test:annotation:${keyword}`;
  const annotation = { $id: id, $anchor: "claimed", type: "number", $ref: "https://missing.invalid/not-supplied" };
  const schema = { $id: id, type: "string", [keyword]: keyword === "examples" || keyword === "x-notes" ? [annotation] : annotation };
  const before = structuredClone(schema);
  const direct = compileJsonSchema(schema);
  const contract = schemaFromGraph({ root: id, schemas: [{ id, schema }] });
  assert.equal(direct.validate("text").valid, true);
  assert.equal(contract.validate("text"), true);
  assert.equal(direct.validate(3).valid, false);
  assert.equal(contract.validate(3), false);
  assert.deepEqual(schema, before);
});

test("annotations cannot supply a missing genuine reference target", () => {
  const root = { $id: "https://schemas.561.group/annotation/root.json", $ref: "child.json", "x-note": { $id: "child.json", type: "string" } };
  assert.equal(compileJsonSchema(root).validate("text").valid, false);
  assert.throws(() => schemaFromGraph({ root: root.$id, schemas: [{ id: root.$id, schema: root }] }), /Invalid schema graph/);
});

test("draft-07 tuple and schema-dependency locations retain genuine reference checks", () => {
  const child = { $schema: "http://json-schema.org/draft-07/schema#", $id: "https://schemas.561.group/draft7/child.json", type: "string" };
  const root = { $schema: child.$schema, $id: "https://schemas.561.group/draft7/root.json", type: "object", dependencies: { trigger: { properties: { value: { $ref: "child.json" } } } }, properties: { tuple: { type: "array", items: [{ $ref: "child.json" }], additionalItems: false } } };
  const validator = compileJsonSchema(root, { references: [child] });
  assert.equal(validator.validate({ trigger: true, value: "text", tuple: ["text"] }).valid, true);
  assert.equal(validator.validate({ trigger: true, value: 4, tuple: ["text"] }).valid, false);
  assert.equal(validator.validate({ tuple: [4] }).valid, false);
  assert.equal(compileJsonSchema(root).validate({}).issues.some(issue => issue.kind === "schema"), true);
});


for (const keyword of ["const", "enum"]) test(`schema-looking ${keyword} instance data does not register identities`, () => {
  const id = `urn:test:instance-data:${keyword}`;
  const value = { $id: id, $anchor: "value", $ref: "https://missing.invalid/data-only", type: "number" };
  const schema = { $id: id, type: "object", [keyword]: keyword === "enum" ? [value] : value };
  assert.equal(compileJsonSchema(schema).validate(value).valid, true);
  const contract = schemaFromGraph({ root: id, schemas: [{ id, schema }] });
  assert.equal(contract.validate(value), true);
  assert.equal(contract.validate({}), false);
});
