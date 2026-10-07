import assert from "node:assert/strict";
import test from "node:test";
import { schemaFrom } from "../src/contracts.mjs";

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
  const a = schemaFrom({ $id: "test/value", type: "string" });
  const b = schemaFrom({ $id: "test/value", type: "number" });
  assert.throws(() => schemaFrom({ $id: "test/root", $ref: "test/value" }, [a, b]), /different contracts share reference address/);
});

test("tuple schemas retain public draft-7 spelling and bound output cardinality", () => {
  const schema = { $id: "test/tuple", type: "array", items: [{ type: "string" }, { type: "number" }], additionalItems: false };
  const tuple = schemaFrom(schema);
  assert.equal(tuple.schema, schema);
  assert.equal(tuple.validate(["x", 1]), true);
  assert.equal(tuple.validate(["x", 1, 2]), false);
  assert.equal(tuple.validate([1, "x"]), false);
});
