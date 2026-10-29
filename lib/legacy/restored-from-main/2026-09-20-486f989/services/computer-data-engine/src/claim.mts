import { defineType, type Result } from "./type-system.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`claim declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/** Executable form of specifications/claim.schema.json. */
export const claimType = established(defineType({
  id: "https://schemas.561.group/computer/claim.schema.json",
  name: "Claim",
  description: "A proposition with provenance, held separate from evidence, truth valuation, authority, and effect.",
  parents: [],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/claim.schema.json",
    type: "object",
    required: ["kind", "subject", "predicate", "object", "provenance"],
    additionalProperties: false,
    properties: {
      kind: { const: "claim" },
      subject: { type: "string", minLength: 1 },
      predicate: { type: "string", minLength: 1 },
      object: {},
      provenance: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    },
  },
}));
