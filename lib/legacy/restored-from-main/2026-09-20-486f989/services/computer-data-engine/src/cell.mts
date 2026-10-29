import { defineType, type Result } from "./type-system.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`cell declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/** Executable form of specifications/cell.schema.json. */
export const cellType = established(defineType({
  id: "https://schemas.561.group/computer/cell.schema.json",
  name: "Cell",
  description: "An addressable position in a relational field; a cell does not itself decide truth or mutate a Thing.",
  parents: [],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/cell.schema.json",
    type: "object",
    required: ["kind", "address", "provenance"],
    additionalProperties: false,
    properties: {
      kind: { const: "cell" },
      address: { type: "string", minLength: 1 },
      provenance: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    },
  },
}));
