import assert from "node:assert/strict";
import test from "node:test";
import { compileJsonSchema, validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
import { schemaFrom, schemaFromGraph, schemaById } from "@red-cup-engineering/json-schema-services-section/contracts";
const own = (name, value) => JSON.parse(`{${JSON.stringify(name)}:${JSON.stringify(value)}}`);
const json = (value) => JSON.parse(JSON.stringify(value));
const cases = [];
const add = (name, schema, value, valid, schemaIssue = false) => cases.push({ name, schema, value, expected: { valid, schemaIssue } });
for (const name of ["toString", "constructor", "__proto__"]) {
  add(`required:${name}:absent`, { type: "object", required: [name] }, JSON.parse("{}"), false);
  add(`required:${name}:own-present`, { type: "object", required: [name] }, own(name, null), true);
  const required = { type: "object", dependentRequired: own(name, ["needed"]) };
  add(`dependentRequired:${name}:absent-trigger`, required, JSON.parse("{}"), true);
  add(`dependentRequired:${name}:own-trigger-missing-dependent`, required, own(name, false), false);
  add(`dependentRequired:${name}:own-trigger-and-dependent`, required, json({ ...own(name, false), needed: true }), true);
  add(`dependentRequired:${name}:missing-own-target`, { type: "object", dependentRequired: { trigger: [name] } }, JSON.parse('{"trigger":true}'), false);
  add(`dependentRequired:${name}:own-target-present`, { type: "object", dependentRequired: { trigger: [name] } }, json({ trigger: true, ...own(name, null) }), true);
  const dependent = { type: "object", dependentSchemas: own(name, { required: ["needed"] }) };
  add(`dependentSchemas:${name}:absent-trigger`, dependent, JSON.parse("{}"), true);
  add(`dependentSchemas:${name}:own-trigger-missing-dependent`, dependent, own(name, false), false);
  add(`dependentSchemas:${name}:own-trigger-and-dependent`, dependent, json({ ...own(name, false), needed: true }), true);
}
add("ref:inherited-prototype", JSON.parse('{"$ref":"#/__proto__"}'), "anything", false, true);
add("ref:own-prototype-false", JSON.parse('{"$ref":"#/__proto__","__proto__":false}'), "anything", false);
add("ref:own-prototype-schema-valid", JSON.parse('{"$ref":"#/__proto__","__proto__":{"const":"owned"}}'), "owned", true);
add("ref:own-prototype-schema-invalid", JSON.parse('{"$ref":"#/__proto__","__proto__":{"const":"owned"}}'), "other", false);
for (const [token, value, expected, schemaIssue] of [
  ["0", "zero", true, false], ["1", "one", true, false],
  ["01", "one", false, true], ["+1", "one", false, true], ["1.0", "one", false, true],
  ["1e0", "one", false, true], ["%201", "one", false, true], ["-0", "zero", false, true],
  ["", "zero", false, true], ["-", "zero", false, true], ["length", "zero", false, true], ["2", "zero", false, true],
]) {
  add(`ref:array:${token || "empty"}`, { prefixItems: [{ const: "zero" }, { const: "one" }], $ref: `#/prefixItems/${token}` }, value, expected, schemaIssue);
}
for (const name of ["01", "+1", "1.0", "1e0", "", "__proto__", "constructor"]) {
  add(`ref:own-object-key:${name || "empty"}`, { $defs: own(name, { const: "owned" }), $ref: `#/$defs/${name}` }, "owned", true);
}
for (const [name, token, valid] of [["~2", "~2", false], ["~2", "~02", true], ["~", "~", false], ["~", "~0", true], ["a/b", "a~1b", true], ["~1", "~01", true]]) {
  add(`ref:escape:${token}`, { $defs: own(name, { const: "owned" }), $ref: `#/$defs/${token}` }, "owned", valid, !valid);
}

for (const item of cases) test(item.name, () => {
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  const schemaBefore = JSON.stringify(item.schema), valueBefore = JSON.stringify(item.value);
  const result = validateJsonSchema(item.value, item.schema);
  assert.deepEqual(compileJsonSchema(item.schema).validate(item.value), result);
  assert.equal(result.valid, item.expected.valid);
  assert.equal(result.issues.some(issue => issue.kind === "schema"), item.expected.schemaIssue);
  assert.equal(JSON.stringify(item.schema), schemaBefore);
  assert.equal(JSON.stringify(item.value), valueBefore);
  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), prototypes);
});
for (const name of ["toString", "constructor", "__proto__"]) {
  test(`undefined runtime compatibility:${name}`, () => {
    const value = Object.fromEntries([[name, undefined]]);
    assert.equal(validateJsonSchema(value, { required: [name] }).valid, false);
    assert.equal(validateJsonSchema(value, { dependentRequired: own(name, ["needed"]) }).valid, true);
    assert.equal(validateJsonSchema(value, { dependentSchemas: own(name, false) }).valid, true);
    assert.equal(validateJsonSchema({ trigger: 1, ...value }, { dependentRequired: { trigger: [name] } }).valid, false);
  });
  test(`draft-07 dependencies own member:${name}`, () => {
    const schema = { $schema: "http://json-schema.org/draft-07/schema#", dependencies: own(name, ["needed"]) };
    assert.equal(validateJsonSchema({}, schema).valid, true);
    assert.equal(validateJsonSchema(own(name, null), schema).valid, false);
    assert.equal(validateJsonSchema({ ...own(name, null), needed: true }, schema).valid, true);
  });
}
const variants = [
  ["prototype-dependencies", '{"__proto__":{"dependencies":{"trigger":["needed"]}}}', {trigger:1}, true],
  ["prototype-dependencies-own-present", '{"__proto__":{"dependencies":{"trigger":["needed"]}}}', {trigger:1,needed:2}, true],
  ["prototype-required-only", '{"__proto__":{"required":["needed"]}}', {trigger:1}, true],
  ["ordinary-annotation", '{"annotation":{"dependencies":{"trigger":["needed"]}}}', {trigger:1}, true],
  ["explicit-dependentRequired-missing", '{"dependentRequired":{"trigger":["needed"]}}', {trigger:1}, false],
  ["explicit-dependentRequired-present", '{"dependentRequired":{"trigger":["needed"]}}', {trigger:1,needed:2}, true],
];
for (const [name, body, value, expected] of variants) test(`contract projection:${name}`, () => {
  const prototypes = Object.getOwnPropertyDescriptors(Object.prototype);
  for(const api of ["compileJsonSchema", "schemaFrom", "schemaFromGraph"]) {
    const id = `urn:test:own-members:${name}:${api}`;
    const schema = { $id:id, type:"object", ...JSON.parse(body) };
    const before = JSON.stringify(schema), valueBefore = JSON.stringify(value);
    const contract = api === "compileJsonSchema" ? compileJsonSchema(schema) : api === "schemaFrom" ? schemaFrom(schema) : schemaFromGraph({ root:id, schemas:[{id,schema}] });
    const result = contract.validate(value);
    assert.equal(api === "compileJsonSchema" ? result.valid : result, expected, api);
    if(api !== "compileJsonSchema") {
      assert.equal(contract.errors(value).length === 0, expected);
      assert.ok(Object.isFrozen(contract)); assert.ok(Object.isFrozen(contract.schema));
      assert.equal(JSON.stringify(contract.schema), JSON.stringify(JSON.parse(JSON.stringify(contract.schema))));
      for (const key of Object.keys(schema)) assert.ok(Object.hasOwn(contract.schema, key));
      if(expected) assert.equal(contract.assert(value), value);
      else assert.throws(() => contract.assert(value), TypeError);
    }
    assert.equal(JSON.stringify(schema), before); assert.equal(JSON.stringify(value), valueBefore);
    assert.equal(Object.getPrototypeOf(schema), Object.prototype);
  }
  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), prototypes);
});
test("schemaFrom captures available registry references at first validation", () => {
  const dep = "urn:test:registry:available-later";
  const root = schemaFrom({ $id: "urn:test:registry:root-before-declaration", $ref: dep });
  schemaFrom({ $id: dep, const: "later" });
  assert.equal(root.validate("later"), true);
  assert.equal(root.validate("other"), false);
});
test("schemaFrom retains first-validation missing-reference outcome", () => {
  const dep = "urn:test:registry:missing-at-first-validation";
  const root = schemaFrom({ $id: "urn:test:registry:captured-missing", $ref: dep });
  assert.equal(root.validate("later"), false);
  const errors = root.errors("later");
  schemaFrom({ $id: dep, const: "later" });
  assert.equal(root.validate("later"), false);
  assert.deepEqual(root.errors("later"), errors);
});
test("schemaFrom explicit reference composition does not replace same-ID registry contract", () => {
  const id = "urn:test:registry:explicit-dependency";
  const registered = schemaFrom({ $id: id, const: "registered" });
  assert.equal(schemaFrom({ $id: id, const: "registered" }), registered);
  assert.throws(() => schemaFrom({ $id: id, const: "different" }), /incompatible schema redefinition/);
  const anchor = schemaFrom({ $id: "urn:test:registry:explicit-anchor", type:"string" });
  const explicit = schemaFrom({ $id:id, const:"explicit" }, [anchor]);
  const root = schemaFrom({ $id: "urn:test:registry:explicit-root", $ref:id }, [explicit]);
  assert.equal(root.validate("explicit"), true);
  assert.equal(root.validate("registered"), false);
  assert.equal(schemaById(id), registered);
});
test("schemaFromGraph uses only explicit graph without registry mutation", () => {
  const dep = "urn:test:registry:graph-dependency", id = "urn:test:registry:graph-root";
  const registered = schemaFrom({ $id:dep, const:"registered" });
  const schema = { $id:id, $ref:dep };
  assert.throws(() => schemaFromGraph({ root:id, schemas:[{id,schema}] }), /Invalid schema graph/);
  const graph = schemaFromGraph({ root:id, schemas:[{id,schema},{id:dep,schema:{$id:dep,const:"explicit"}}] });
  assert.equal(graph.validate("explicit"), true);assert.equal(graph.validate("registered"), false);
  assert.equal(schemaById(dep), registered);assert.equal(schemaById(id), undefined);
});
