import { defineType, type Result } from "./type-system.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`rule declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/** Executable form of specifications/rule.schema.json. */
export const ruleType = established(defineType({
  id: "https://schemas.561.group/computer/rule.schema.json",
  name: "Rule",
  description: "A source-provenanced normative constraint applied conjunctively with every non-superseded, in-scope Founder Direction.",
  parents: [],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/rule.schema.json",
    type: "object",
    required: ["kind", "statement", "provenance"],
    additionalProperties: false,
    properties: {
      kind: { const: "rule" },
      statement: { type: "string", minLength: 1 },
      provenance: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    },
  },
}));
