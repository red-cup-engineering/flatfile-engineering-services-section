import assert from "node:assert/strict";
import test from "node:test";
import { addType, admit, admitFromSystem, createTypeSystem, defineType, removeType, replaceType, specializeType, } from "../../src/type-system/type-system.mjs";
function admitted(result) {
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result));
    return result;
}
test("specialization admits only values admitted by its parents and local schema", () => {
    const person = admitted(defineType({
        id: "person",
        name: "Person",
        description: "A person with a name.",
        parents: [],
        schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    })).value;
    const employee = admitted(specializeType([person], {
        id: "employee",
        name: "Employee",
        description: "A person with an employee number.",
        schema: { type: "object", properties: { employeeNumber: { type: "string" } }, required: ["employeeNumber"] },
    })).value;
    assert.equal(admit(employee, { name: "Ada", employeeNumber: "E-1" }).ok, true);
    assert.equal(admit(employee, { employeeNumber: "E-1" }).ok, false);
    assert.equal(admit(employee, { name: "Ada" }).ok, false);
});
test("definitions copy schemas without freezing or retaining caller-owned objects", () => {
    const schema = { type: "object", properties: { code: { type: "string" } }, required: ["code"] };
    const type = admitted(defineType({ id: "code", name: "Code", description: "A code.", parents: [], schema })).value;
    assert.equal(Object.isFrozen(schema), false);
    schema.properties.code.type = "number";
    assert.equal(admit(type, { code: "still-a-string" }).ok, true);
});
test("referenced schema graphs are explicit, immutable, and isolated between declarations", () => {
    const reference = { $id: "urn:test:dispatch-input", type: "string", minLength: 2 };
    const definition = { id: "dispatch-input", name: "Dispatch input", description: "Referenced input.", parents: [], schema: { $ref: reference.$id } };
    assert.equal(defineType(definition).ok, false);
    const type = admitted(defineType({ ...definition, references: [reference] })).value;
    reference.type = "number";
    assert.equal(admit(type, "ok").ok, true);
    assert.equal(admit(type, "x").ok, false);
    assert.equal(admit(type, 12).ok, false);
    assert.equal(Object.isFrozen(type.references[0]), true);
    assert.equal(defineType(definition).ok, false);
});
test("definitions and catalog graphs refuse invalid, ambiguous, and stale parent relations", () => {
    assert.equal(defineType({ id: "", name: "Bad", description: "Bad.", parents: [], schema: true }).ok, false);
    assert.equal(defineType({ id: "bad-schema", name: "Bad schema", description: "Bad.", parents: [], schema: { $schema: "https://example.invalid/schema" } }).ok, false);
    const baseA = admitted(defineType({ id: "base", name: "Base A", description: "A string.", parents: [], schema: { type: "string" } })).value;
    const baseB = admitted(defineType({ id: "base", name: "Base B", description: "A number.", parents: [], schema: { type: "number" } })).value;
    const child = admitted(specializeType([baseA], { id: "child", name: "Child", description: "A child.", schema: true })).value;
    assert.equal(createTypeSystem([baseA, baseB]).ok, false);
    assert.equal(createTypeSystem([child]).ok, false);
    const mismatched = createTypeSystem([baseB, child]);
    assert.equal(mismatched.ok, false);
    if (!mismatched.ok)
        assert.equal(mismatched.refusal.kind, "invalid-type");
});
test("catalog admission resolves current declarations and protects referenced bases", () => {
    const base = admitted(defineType({ id: "base", name: "Base", description: "A string.", parents: [], schema: { type: "string" } })).value;
    const child = admitted(specializeType([base], { id: "child", name: "Child", description: "A child string.", schema: { minLength: 2 } })).value;
    const catalog = admitted(createTypeSystem([base])).value;
    const withChild = admitted(addType(catalog, child)).value;
    assert.equal(admitFromSystem(withChild, "child", "ok").ok, true);
    assert.equal(admitFromSystem(withChild, "child", "x").ok, false);
    assert.equal(replaceType(withChild, base).ok, false);
    assert.equal(removeType(withChild, "base").ok, false);
});
