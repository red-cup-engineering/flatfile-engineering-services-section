const closed = {
    type: "array",
    prefixItems: [{ type: "string" }, { type: "null" }],
    items: false,
    minItems: 2,
};
const legacyClosed = {
    type: "array",
    items: [{ type: "string" }, { type: "null" }],
    additionalItems: false,
    minItems: 2,
};
const optional = {
    type: "array",
    prefixItems: [{ type: "string" }, { type: "null" }],
    items: false,
    minItems: 1,
};
const open = {
    type: "array",
    prefixItems: [{ type: "string" }, { type: "null" }],
    items: { type: "boolean" },
    minItems: 2,
};
const allOptional = {
    type: "array",
    prefixItems: [{ type: "string" }, { type: "null" }, { type: "boolean" }],
    items: false,
    minItems: 0,
};
const unionTail = {
    type: "array",
    prefixItems: [{ type: "string" }],
    items: { type: ["boolean", "number"] },
    minItems: 1,
};
const empty = { type: "array", items: false };
const optionalAccepted = ["x", null, true];
const tailAccepted = ["x", false, 2];
// @ts-expect-error closed tuples reject an item after the third prefix position
const optionalRejected = ["x", null, true, false];
// @ts-expect-error open tails still require their prefix
const tailRejected = [];
void [optionalAccepted, tailAccepted, optionalRejected, tailRejected];
const intersection = { allOf: [{ type: "string" }, { enum: ["a", "b"] }] };
import { admit, defineType, specializeType } from "../src/index.mjs";
const named = defineType({
    id: "Named", name: "Named", description: "A value with a name.", parents: [],
    schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
});
if (named.ok) {
    const counted = specializeType([named.value], {
        id: "Counted", name: "Counted", description: "A named value with a count.",
        schema: { type: "object", properties: { count: { type: "number" } }, required: ["count"] },
    });
    if (counted.ok) {
        const result = admit(counted.value, { name: "example", count: 1 });
        if (result.ok) {
            const name = result.value.name;
            const count = result.value.count;
            // @ts-expect-error the parent contract survives specialization
            const wrongName = result.value.name;
            // @ts-expect-error the local contract survives admission
            const wrongCount = result.value.count;
        }
    }
}
