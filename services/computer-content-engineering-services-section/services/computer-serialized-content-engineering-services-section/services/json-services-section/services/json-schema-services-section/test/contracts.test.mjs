import assert from "node:assert/strict";
import test from "node:test";
import { schemaFrom, schemaFromGraph } from "../src/contracts.mjs";

test("contracts admit cross-schema references and preserve the supplied value", () => {
  const name = schemaFrom({ $id: "test/person/name", type: "string", minLength: 1 });
  const person = schemaFrom({ $id: "test/person", type: "object", properties: { name: { $ref: "test/person/name" } }, required: ["name"] }, [name]);
  const value = { name: "Ada" };
  assert.equal(person.assert(value), value);
  assert.equal(person.kind, "schema-contract");
  assert.equal(person.validate({ name: 3 }), false);
  assert.throws(() => person.assert({ name: 3 }, "person input"), /person input.*string/);
  assert.deepEqual(person.references, [name]);
});

test("conflicting reference identities are rejected before constructing a contract", () => {
  const id = "test/reference-conflict/value";
  const a = schemaFromGraph({ root: id, schemas: [{ id, schema: { $id: id, type: "string" } }] });
  const b = schemaFromGraph({ root: id, schemas: [{ id, schema: { $id: id, type: "number" } }] });
  assert.throws(() => schemaFrom({ $id: "test/reference-conflict/root", $ref: id }, [a, b]), /different contracts share reference address/);
  const left = schemaFrom({ $id: "test/reference-conflict/left", $ref: id }, [a]);
  const right = schemaFrom({ $id: "test/reference-conflict/right", $ref: id }, [b]);
  assert.throws(() => schemaFrom({ $id: "test/reference-conflict/transitive", $ref: left.id }, [left, right]), /different contracts share reference address/);
});

test("ordinary registry declarations refuse a different schema under the same identity", () => {
  const schema = { $id: "test/registry-redefinition/value", type: "string" };
  const first = schemaFrom(schema);
  assert.equal(schemaFrom({ ...schema }), first);
  assert.throws(() => schemaFrom({ $id: schema.$id, type: "number" }), /incompatible schema redefinition/);
});

test("tuple schemas retain public draft-7 spelling and bound output cardinality", () => {
  const schema = { $id: "test/tuple", type: "array", items: [{ type: "string" }, { type: "number" }], additionalItems: false };
  const tuple = schemaFrom(schema);
  assert.notEqual(tuple.schema, schema);
  assert.deepEqual(tuple.schema, schema);
  assert.ok(Object.isFrozen(tuple.schema));
  assert.ok(Object.isFrozen(tuple.schema.items));
  assert.ok(tuple.schema.items.every(Object.isFrozen));
  assert.equal(Object.isFrozen(schema), false);
  schema.items[0].type = "integer";
  schema.additionalItems = true;
  assert.equal(tuple.schema.items[0].type, "string");
  assert.equal(tuple.schema.additionalItems, false);
  assert.equal(tuple.validate(["x", 1]), true);
  assert.equal(tuple.validate(["x", 1, 2]), false);
  assert.equal(tuple.validate([1, "x"]), false);
});
