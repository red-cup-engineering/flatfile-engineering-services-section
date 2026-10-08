import { makeDiagnostic } from "./diagnostic.mjs";

const POSITION_KEYS = Object.freeze(["introduces", "recaps", "discusses", "chapters"]);
const DEFAULT_EXCLUDED_DIRS = Object.freeze(["references"]);

// Notes that no other note references and that don't position anything.
// Excluded by default: notes in a references/ directory (standalone
// bibliographic entries), narratives that declare a positioning key, and
// questions that declare explores. "Referenced" is every buildEdges
// target — both fm-relation and body-link edges.
export function check(notes, edges, { excludedDirs = DEFAULT_EXCLUDED_DIRS } = {}) {
  const referenced = new Set(edges.map((edge) => edge.dst));
  const excluded = new Set(excludedDirs);
  const diagnostics = [];
  for (const note of notes) {
    if (referenced.has(note.slug)) continue;
    if (excluded.has(note.dir)) continue;
    if (note.kind === "narrative" && POSITION_KEYS.some((key) => note.fm[key])) continue;
    if (note.kind === "question" && note.fm.explores) continue;
    diagnostics.push(makeDiagnostic({
      rule: "orphans",
      path: note.path,
      slug: note.slug,
      message: `\`${note.slug}\` — no incoming references`,
    }));
  }
  return diagnostics;
}


