import assert from "node:assert/strict";
import test from "node:test";
import { collectTypeSystem, defineType, isSubtypeOf, specializeType } from "../../src/type-system/type-system.mjs";
function value(result) {
    assert.equal(result.ok, true);
    if (!result.ok)
        throw new Error(JSON.stringify(result.refusal));
    return result.value;
}
test("a shared diamond has one declaration per identity and closes all ancestors", () => {
    const root = value(defineType({ id: "number", name: "Number", description: "A number.", schema: { type: "number" }, parents: [] }));
    const positive = value(specializeType([root], { id: "positive", name: "Positive", description: "Positive number.", schema: { exclusiveMinimum: 0 } }));
    const integer = value(specializeType([root], { id: "integer", name: "Integer", description: "Integer number.", schema: { type: "integer" } }));
    const count = value(specializeType([positive, integer], { id: "count", name: "Count", description: "Positive integer.", schema: true }));
    assert.equal(value(collectTypeSystem([count, integer])).types.length, 4);
    assert.equal(isSubtypeOf(count, root), true);
    assert.equal(isSubtypeOf(root, count), false);
    assert.equal(isSubtypeOf(positive, integer), false);
});
test("equal names cannot substitute different declarations at a composition boundary", () => {
    const declare = (schema) => value(defineType({ id: "value", name: "Value", description: "A value.", schema, parents: [] }));
    const left = declare({ type: "string" });
    const right = declare({ type: "number" });
    assert.equal(collectTypeSystem([left, right]).ok, false);
    assert.equal(isSubtypeOf(left, right), false);
    assert.equal(isSubtypeOf(left, left), true);
    assert.equal(collectTypeSystem([{ ...left }]).ok, false);
});
