import { defineType, type Result } from "./type-system.mjs";
import { evidenceType } from "./evidence.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`statement declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/** Executable form of specifications/statement.schema.json. */
export const statementType = established(defineType({
  id: "https://schemas.561.group/computer/statement.schema.json",
  name: "Statement",
  description: "The portable four-place assertion (subject, predicate, object, witness). EAVT is its durable row representation; neither suppresses contradictory witnessed assertions.",
  parents: [],
  references: [evidenceType.schema],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/statement.schema.json",
    type: "object",
    required: ["subject", "predicate", "object", "witness"],
    additionalProperties: false,
    properties: {
      subject: { type: "object" },
      predicate: { type: "string", minLength: 1 },
      object: { type: "object" },
      witness: { $ref: "evidence.schema.json" },
    },
  },
}));
