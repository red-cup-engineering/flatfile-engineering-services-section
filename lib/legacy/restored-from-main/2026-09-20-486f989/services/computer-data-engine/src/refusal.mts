import { defineType, type Result } from "./type-system.mjs";
import { evidenceType } from "./evidence.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`refusal declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/** Executable form of specifications/refusal.schema.json. */
export const refusalType = established(defineType({
  id: "https://schemas.561.group/computer/refusal.schema.json",
  name: "Refusal",
  description: "A typed non-admission or non-delivery outcome naming the condition and its evidence. It never becomes an exception-shaped hidden state.",
  parents: [],
  references: [evidenceType.schema],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/refusal.schema.json",
    type: "object",
    required: ["kind", "code", "message", "evidence"],
    additionalProperties: false,
    properties: {
      kind: { const: "refusal" },
      code: { type: "string", minLength: 1 },
      message: { type: "string", minLength: 1 },
      evidence: { $ref: "evidence.schema.json" },
    },
  },
}));
