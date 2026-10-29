import { defineType, type Result } from "./type-system.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`actor/resource declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/** Executable form of specifications/resource.schema.json. */
export const resourceType = established(defineType({
  id: "https://schemas.561.group/computer/resource.schema.json",
  name: "Resource",
  description: "An addressable, classed, provenance-carrying resource.",
  parents: [],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/resource.schema.json",
    type: "object",
    required: ["kind", "address", "resourceClass", "provenance"],
    additionalProperties: false,
    properties: {
      kind: { const: "resource" },
      address: { type: "string", minLength: 1 },
      resourceClass: { type: "string", minLength: 1 },
      provenance: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    },
  },
}));
