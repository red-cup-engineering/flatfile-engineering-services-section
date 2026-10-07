import assert from "node:assert/strict";
import test from "node:test";
import { Mark, MarkType } from "../src/mark.mjs";
import { instantiate, specializeType } from "@red-cup-engineering/computer-data-services-section/type-system";
test("Marks preserve opaque payloads and share a specializable admission contract", () => {
    const payload = { evidence: [true, false] };
    const value = new Mark(payload);
    assert.equal(value.value, payload);
    assert(Object.isFrozen(value));
    assert(!Object.isFrozen(payload));
    assert.throws(() => new Mark(undefined), /present/);
    const textMark = specializeType([MarkType], {
        id: "TextMark", name: "TextMark", description: "A Mark carrying text.",
        schema: { type: "object", properties: { value: { type: "string" } } },
    });
    assert(textMark.ok);
    assert(instantiate(textMark.value, new Mark("hello")).ok);
    assert(!instantiate(textMark.value, new Mark(1)).ok);
});


test("coincidence preserves transported JSON and refuses what is not a carrier", async () => {
    const { coincides, isMark } = await import("../src/mark.mjs");
    const shared = { value: 3 };
    const json = { first: shared, second: shared };
    assert.equal(coincides(json, JSON.parse(JSON.stringify(json))), true);
    assert.throws(() => coincides(new Date(0), new Date(1)), TypeError);
    assert.throws(() => coincides(new Map([["a", 1]]), new Map([["b", 2]])), TypeError);
    assert.throws(() => coincides(Array(1), [7]), TypeError);
    const left = {}; left.self = left;
    const right = {}; right.self = right;
    assert.throws(() => coincides(left, right), TypeError);
    assert.throws(() => coincides(left, left), TypeError);
    let a = 1, b = 1;
    for (let i = 0; i < 20_000; i++) { a = [a]; b = [b]; }
    assert.equal(coincides(a, b), true);
    assert.equal(isMark({ kind: "utterance.mark", value: undefined }), false);
    assert.equal(isMark({ kind: "utterance.mark", value: 1, hidden: 2 }), false);
    assert.equal(isMark({ kind: "utterance.mark", value: 1 }), true);
});
