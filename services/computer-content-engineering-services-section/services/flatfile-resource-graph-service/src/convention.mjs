export const KIND_LABEL = Object.freeze({
  concept: "Concept",
  definition: "Definition",
  morphism: "Definition",
  theorem: "Theorem",
  lemma: "Lemma",
  proposition: "Proposition",
  corollary: "Corollary",
  example: "Example",
  question: "Open problem",
  conjecture: "Conjecture",
});

export const THEOREM_KINDS = new Set(["theorem", "lemma", "proposition", "corollary"]);

export const ANCHOR_KINDS = new Set(["definition", "concept", "morphism"]);

export const BADGE_KINDS = new Set([...THEOREM_KINDS, "conjecture"]);

export const UNPROVED = new Set(["draft", "sketch", "wip"]);
export const PROVED = new Set(["proved"]);

export const RELATION_KEYS = Object.freeze([
  "depends-on", "introduces", "recaps", "discusses",
  "instantiates", "see-also", "realizes", "closes",
  "chapters", "explores", "specializes", "component-of",
]);

export const INTERNAL_FIELDS = new Set(["kind", "status", "anchor", "references", ...RELATION_KEYS]);

export const META = new Set([
  "title", "description", "summary", "name", "slug", "layout", "aliases",
  "date", "date-created", "date-modified", "date-updated", "date-completed",
  "date-published", "date-introduced", "modified", "task-done",
  "authors", "permalink", "dg-permalink", "dg-publish", "x-permalink",
  "toc", "draft", "draft-names", "color", "color-scheme", "language",
  "redirect_to", "description-title", "x-i18n", "tags", "readiness",
]);

export const SCALAR_CONFIG = new Set([
  "temperature", "top_p", "presence_penalty", "frequency_penalty",
  "max_tokens", "n", "model", "stop",
  "version", "nav_order", "index", "priority", "number", "position-in-cycle",
  "year", "section",
  "note-maturity", "title-class",
]);

export const SUBCOLLECTIONS = new Set([
  "terms", "texts", "narratives", "concepts", "objects", "morphisms",
  "theorems", "questions", "examples", "references", "archive", "domains",
  "logs", "records",
]);

export const DEFAULT_LIB_DIRS = Object.freeze([
  "concepts", "objects", "morphisms", "theorems",
  "examples", "narratives", "questions", "references",
]);


