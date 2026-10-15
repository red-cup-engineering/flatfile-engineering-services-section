import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { schemaFromGraph } from "../src/contracts.mjs";

// Source snapshots, not substitute schema definitions. See the fixture provenance.
const read = name => JSON.parse(readFileSync(new URL(`./fixtures/feltos-strategy/${name}.json`, import.meta.url), "utf8"));
const schemas = ["strategy", "actor", "operation", "sen-term", "sen-ty", "sen-tm"].map(name => read(`${name}.schema`));
const strategy = schemas[0], value = read("strategy-value");
const graph = (members = schemas) => schemaFromGraph({ root: strategy.$id, schemas: members.map(schema => ({ id: schema.$id, schema })) });

test("unchanged FeltOS strategy receives its genuine Actor and operation/SEN graph", () => {
  assert.equal(strategy.properties.operation.$ref, "operation.schema.json");
  assert.equal(strategy.properties.actor.$ref, "https://561.group/schema/computer-data/actor#/$defs/address");
  const contract = graph();
  assert.equal(contract.validate(value), true);
  assert.equal(contract.assert(value), value);
  assert.deepEqual(contract.schema, strategy);
  assert.equal(contract.validate({ ...value, actor: "not-an-actor" }), false);
  assert.equal(contract.validate({ ...value, operation: { ...value.operation, version: 2 } }), false);
  assert.equal(contract.validate({ ...value, operation: { ...value.operation, body: { ...value.operation.body, term: { kind: "variable", index: 0 } } } }), false);
  assert.equal(contract.validate({ ...value, operation: { ...value.operation, body: { kind: "rmn", term: ["var", 0] } } }), false);
});

for (const omitted of schemas.slice(1)) test(`FeltOS receiving refuses missing owner ${omitted.$id}`, () => {
  assert.throws(() => graph(schemas.filter(schema => schema !== omitted)), /Invalid schema graph/);
});

test("FeltOS receiving refuses conflicting same-address input", () => {
  assert.throws(() => graph([...schemas, { ...schemas[2], type: "string" }]), /Invalid schema graph/);
});
