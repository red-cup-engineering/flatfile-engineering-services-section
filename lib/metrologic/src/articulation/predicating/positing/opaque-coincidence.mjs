/**
 * positing/opaque-coincidence — coincidence of opaque witnesses.
 *
 * The reading algebra and a handful of settling-analysis modules need to decide
 * whether two opaque witnesses (evidence payloads, term labels) are the same
 * datum, without knowing anything about what that datum represents. Sameness of
 * a datum is content identity, stated once beside the content address in the
 * data layer; this module re-exports it rather than restating it.
 */
import { coincides } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

export { coincides };

/** Whether two terms coincide by their carried value (a term is any `{ mark: { value } }`-shaped carrier). */
export const termCoincides = (left, right) => coincides(left.mark.value, right.mark.value);

/** A minimal, dependency-free opaque-datum wrapper shape, for callers that only need the
 *  `{ kind: "utterance.mark", value }` wire shape without the Sign family's admitted Mark type. */
export const opaqueWitnessSchema = Object.freeze({
    type: "object",
    required: ["kind", "value"],
    properties: { kind: { const: "utterance.mark" }, value: {} },
    additionalProperties: false,
});

/** Wrap a bare value as an opaque witness (the wire shape a Mark carries, without the Mark type). */
export const opaqueWitness = (value) => Object.freeze({ kind: "utterance.mark", value });

/** Type guard for an opaque witness: the `utterance.mark` shape the reading algebra carries as evidence, judged by shape alone. */
export function isOpaqueWitness(value) {
  return typeof value === "object" && value !== null && value.kind === "utterance.mark" && "value" in value;
}
