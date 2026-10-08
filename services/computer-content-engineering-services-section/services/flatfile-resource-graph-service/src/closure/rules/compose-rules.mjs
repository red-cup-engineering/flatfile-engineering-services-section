import { buildEdges } from "../../substrate/store.mjs";
import { check as checkAmbiguousReference } from "./ambiguous-reference.mjs";
import { check as checkBrokenLinks } from "./broken-links.mjs";
import { check as checkCycles } from "./cycles.mjs";
import { check as checkOrphans } from "./orphans.mjs";
import { check as checkProofs } from "./proofs.mjs";
import { check as checkStatusConsistency } from "./status-consistency.mjs";
import { check as checkStubs } from "./stubs.mjs";
import { check as checkSymbols } from "./symbols.mjs";

function buildBySlug(notes) {
  const bySlug = new Map();
  for (const note of notes) {
    if (!bySlug.has(note.slug)) bySlug.set(note.slug, []);
    bySlug.get(note.slug).push(note);
  }
  return bySlug;
}

function buildDependsOn(edges) {
  const dependsOn = new Map();
  for (const edge of edges) {
    if (edge.kind !== "depends-on") continue;
    if (!dependsOn.has(edge.src)) dependsOn.set(edge.src, []);
    dependsOn.get(edge.src).push(edge.dst);
  }
  return dependsOn;
}

// Runs every default rule over notes and concatenates their diagnostics —
// the convenience composition for "run all standard checks." For finer
// control (custom rule sets, single-rule runs, a broader slug universe
// for cross-tree link resolution) call individual rules directly.
//
// slugUniverse (optional): a slug -> notes index broader than notes
// itself, used as the resolution universe for broken-links. Defaults to
// the local bySlug(notes).
export function composeRules(notes, { minBodyChars = 200, slugUniverse = null } = {}) {
  const bySlug = buildBySlug(notes);
  const edges = buildEdges(notes);
  const dependsOn = buildDependsOn(edges);
  const knownSlugs = new Set((slugUniverse ?? bySlug).keys());

  return [
    ...checkCycles(dependsOn, bySlug),
    ...checkBrokenLinks(edges, bySlug, knownSlugs),
    ...checkAmbiguousReference(edges, bySlug),
    ...checkStubs(notes, { minChars: minBodyChars }),
    ...checkOrphans(notes, edges),
    ...checkStatusConsistency(notes, bySlug),
    ...checkProofs(notes),
    ...checkSymbols(notes),
  ];
}


