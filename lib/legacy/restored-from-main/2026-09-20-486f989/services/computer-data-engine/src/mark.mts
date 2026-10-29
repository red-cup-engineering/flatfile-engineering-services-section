import { defineType, instantiate } from "./type-system.mjs";

/** Opaque present datum. Payload interpretation belongs to the selected type or codec. */
export const MarkSchema = {
  type: "object", required: ["kind", "value"],
  properties: { kind: { const: "utterance.mark" }, value: {} },
  additionalProperties: false,
} as const;

const definition = defineType({
  id: "Mark", name: "Mark", description: "An opaque present datum whose interpretation belongs to its consumer.",
  schema: MarkSchema, parents: [],
});
if (!definition.ok) throw new TypeError(definition.refusal.message);
/** The common Mark admission contract; specialize its value for an interpreted datum. */
export const MarkType = definition.value;

export class Mark<T = unknown> {
  readonly kind = "utterance.mark" as const;
  readonly value: T;
  constructor(value: T) {
    this.value = value;
    if (!instantiate(MarkType, this).ok) throw new TypeError("Mark: value must be present");
    Object.freeze(this);
  }
}
export function mark<T>(value: T): Mark<T> { return new Mark(value); }
