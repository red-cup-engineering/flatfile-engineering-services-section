/**
 * reflexing — the primitive act of turning back upon itself: reflex(S) =
 * relating(S, S), one instantaneous self-application (data/records/ontology.ttl
 * `rel:Reflexing`). Reflexing is the ENGINE; Differentiating is its product.
 * Distinguished from Reflecting, which holds the reflexive relation open
 * across a sequence (R(0) := S, R(n+1) := reflex(R(n))) rather than applying
 * it once — Reflecting is out of scope here; this module carries only the
 * one-step act named by the ruled `reflexing.schema.json`.
 *
 * The schema literal below is the same content as the authored, ruled
 * `data/records/schema/reflexing.schema.json` — checked byte-for-byte by
 * test/reflexing.test.mjs. `reflex()` is the law itself, expressed as code:
 * not a carrier alongside relating(S, S), but literally that call.
 */

import { defineType, admit } from "@red-cup-engineering/computer-system-engine/type-system";
import { relating } from "./relating.mjs";

export const reflexingSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "relating/reflexing",
  title: "Reflexing",
  description:
    "The primitive act of turning back upon itself: reflex(S) = relating(S, S), one instantaneous self-application (ontology.ttl `rel:Reflexing`). Reflexing is the ENGINE; Differentiating is its product. Distinguished from Reflecting, which holds the reflexive relation open across a sequence (R(0) := S, R(n+1) := reflex(R(n))) rather than applying it once.",
  type: "object",
  required: ["kind", "subject"],
  properties: {
    kind: { const: "reflexing" },
    subject: {
      description:
        "The S in reflex(S) = relating(S, S): the one term the act applies to itself, occupying both the subject-side and the object-side of the relating it produces.",
    },
  },
  additionalProperties: false,
};

/** The carrier type derived from `reflexingSchema`, generic over its one self-applied term. */

/** Unwraps a definition known to be valid at authoring time; a refusal here is a bug in this module. */
function mustDefine(
  definition,
) {
  const result = defineType(definition);
  if (!result.ok) throw new Error(`reflexing: schema failed to define: ${result.refusal.message}`);
  return result.value;
}

/** The catalogued Reflexing type: the house type engine's admission law for this carrier. */
export const ReflexingType = mustDefine({
  id: "science/philosophy/relationality/reflexing",
  name: "Reflexing",
  description: reflexingSchema.description,
  schema: reflexingSchema,
  parents: [],
});

/** Constructs an already-admitted Reflexing carrier naming the act, not yet its product. */
export function reflexing(subject) {
  return Object.freeze({ kind: "reflexing", subject });
}

/** Admits an untyped value (JSON, frontmatter, external input) as a Reflexing carrier or a typed refusal. */
export function admitReflexing(value) {
  return admit(ReflexingType, value);
}

/**
 * The law itself, as code: reflex(S) = relating(S, S). Reflexing's product —
 * what Differentiating names in ontology.ttl — is this Relating carrier, not
 * the Reflexing carrier above. `reflexing(subject)` names the act; `reflex(subject)`
 * is the act's one instantaneous self-application, producing the relation.
 */
export function reflex(subject) {
  return relating(subject, subject);
}
