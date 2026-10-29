import { defineType, makeThing } from "../src/index.mjs";
const resourceResult = defineType({
    id: "typecheck-resource",
    name: "Typecheck resource",
    description: "A resource used only to check Thing's static admission boundary.",
    parents: [],
    schema: {
        type: "object",
        properties: { name: { type: "string" }, path: { type: "string" } },
        required: ["name", "path"],
        additionalProperties: false,
    },
});
if (!resourceResult.ok)
    throw new Error("test declaration must be valid");
makeThing({ type: resourceResult.value, attributes: { name: "Thing", path: "/thing" } });
// @ts-expect-error A Thing's attributes must satisfy the declared DataType at compile time.
makeThing({ type: resourceResult.value, attributes: { name: "Thing" } });
