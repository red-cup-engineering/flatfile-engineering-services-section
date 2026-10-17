/**
 * Metrologic's schematic Mark: a present but uninterpreted value, whose
 * contents can be any separately admitted schema. This is an articulation
 * carrier, NOT an equality predicate, identity address, evidence telling,
 * content hash, or permission to identify two occurrences.
 *
 * Source: Obsmetrologia Primitive.Mark and Articulation.Utterance.
 * SignCell owns technological admission and NI identity downstream.
 */
export const MarkSchema = Object.freeze({
  type: "object",
  required: ["kind", "value"],
  properties: { kind: { const: "utterance.mark" }, value: {} },
  additionalProperties: false,
});

/** Introduce no free structure beyond the currently presented datum. */
export const mark = (value) => Object.freeze({ kind: "utterance.mark", value });

/** A shape guard, not a decision of observational equivalence. */
export const isMark = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)
  && value.kind === "utterance.mark"
  && Object.hasOwn(value, "value")
  && Object.keys(value).every(key => key === "kind" || key === "value");
