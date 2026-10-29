import { defineType, type Result } from "./type-system.mjs";
import { evidenceType } from "./evidence.mjs";

const established = <Value, Refusal>(result: Result<Value, Refusal>): Value => {
  if (!result.ok) throw new TypeError(`receipt declaration refused: ${JSON.stringify(result.refusal)}`);
  return result.value;
};

/**
 * Inlined rather than cross-package $ref'd: this is exactly
 * `@red-cup-engineering/actor-engineering-services-section`'s own
 * `data/records/schema/actor.schema.json` `#/$defs/address` pattern
 * (`^actor:[A-Za-z0-9_-]+$`). Copied because that file lives under a
 * package's private `data/records/` tree, not a published export subpath;
 * reference it directly instead if that ever changes.
 */
const actorAddressSchema = Object.freeze({ type: "string" as const, pattern: "^actor:[A-Za-z0-9_-]+$" });

/** Executable form of specifications/receipt.schema.json. */
export const receiptType = established(defineType({
  id: "https://schemas.561.group/computer/receipt.schema.json",
  name: "Receipt",
  description: "Receiver-produced evidence that a named effect or delivery condition occurred. A provider's report is not a receipt.",
  parents: [],
  references: [evidenceType.schema],
  schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.561.group/computer/receipt.schema.json",
    type: "object",
    required: ["kind", "effect", "receiver", "evidence"],
    additionalProperties: false,
    properties: {
      kind: { const: "receipt" },
      effect: { type: "string", minLength: 1 },
      receiver: actorAddressSchema,
      evidence: { $ref: "evidence.schema.json" },
    },
  },
}));
