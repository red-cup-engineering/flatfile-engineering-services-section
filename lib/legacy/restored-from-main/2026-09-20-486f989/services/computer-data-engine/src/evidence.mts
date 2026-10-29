import { defineType, type Result } from "./type-system.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`evidence declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/** Executable form of specifications/evidence.schema.json. */
export const evidenceType = established(defineType({
  id: "https://schemas.561.group/computer/evidence.schema.json",
  name: "Evidence",
  description: "An observed or sourced carrier. Evidence supports a claim or relation witness; it never silently establishes truth or authority.",
  parents: [],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/evidence.schema.json",
    type: "object",
    required: ["kind", "source", "observedAt", "content", "provenance"],
    additionalProperties: false,
    properties: {
      kind: { const: "evidence" },
      source: { type: "string", minLength: 1 },
      observedAt: { type: "string", format: "date-time" },
      content: { type: "object" },
      provenance: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    },
  },
}));
