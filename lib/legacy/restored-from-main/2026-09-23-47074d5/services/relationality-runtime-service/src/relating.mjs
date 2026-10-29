/**
 * relating — the philosophical primitive of the relationality framework: the
 * directed act that constitutes its terms, holding including and excluding
 * together in productive opposition rather than connecting things that
 * already exist (data/records/ontology.ttl `rel:Relating`;
 * content/text/glossary/terms/relating.md). Identified in the mathematical
 * layer with predication.
 *
 * This module's schema literal is the same content as the authored, ruled
 * `data/records/schema/relating.schema.json` — checked byte-for-byte by
 * test/relating.test.mjs so the executable carrier and the ruled record
 * cannot silently drift apart. `defineType` (the house type engine) is the
 * single admission law; `relating()` builds an already-admitted value,
 * `admitRelating()` is the boundary check for values arriving from JSON,
 * markdown frontmatter, or any other untyped source.
 */

import { defineType, admit } from "@red-cup-engineering/computer-system-engine/type-system";

export const relatingSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "relating",
  title: "Relating",
  description:
    "The philosophical primitive of the relationality framework: the directed act that constitutes its terms, holding including and excluding together in productive opposition rather than connecting things that already exist (ontology.ttl `rel:Relating`; content/text/glossary/terms/relating.md). Identified in the mathematical layer with predication. Root of the semiotic agents stack: relating → (communicating, knowing, playing) → animating → (socializing, computing, gaming) → organizing.",
  type: "object",
  required: ["kind", "subject", "object"],
  properties: {
    kind: { const: "relating" },
    subject: {
      description:
        "The subject-side term the act of relating constitutes. Structurally distinct from the object-side even when the predicate's effect is symmetric — relating is directed, never symmetric by default.",
    },
    object: {
      description: "The object-side term the act of relating constitutes.",
    },
  },
  additionalProperties: false,
};

/** The carrier type derived from `relatingSchema`, generic over its two open-typed terms. */

/** Unwraps a definition known to be valid at authoring time; a refusal here is a bug in this module. */
function mustDefine(
  definition,
) {
  const result = defineType(definition);
  if (!result.ok) throw new Error(`relating: schema failed to define: ${result.refusal.message}`);
  return result.value;
}

/** The catalogued Relating type: the house type engine's admission law for this carrier. */
export const RelatingType = mustDefine({
  id: "science/philosophy/relationality/relating",
  name: "Relating",
  description: relatingSchema.description,
  schema: relatingSchema,
  parents: [],
});

/** Constructs an already-admitted Relating carrier from its subject and object terms. */
export function relating(subject, object) {
  return Object.freeze({ kind: "relating", subject, object });
}

/** Admits an untyped value (JSON, frontmatter, external input) as a Relating carrier or a typed refusal. */
export function admitRelating(value) {
  return admit(RelatingType, value);
}
