import { makeDiagnostic } from "./diagnostic.mjs";

const RELEVANT_DIRS = Object.freeze(["concepts", "objects", "morphisms", "theorems"]);

// Two or more notes claiming the same symbol — a canonical-notation
// collision. A soft warning: the same symbol legitimately reappears
// across unrelated domains in the wider library.
export function check(notes, { relevantDirs = RELEVANT_DIRS } = {}) {
  const relevant = new Set(relevantDirs);
  const bySymbol = new Map();
  for (const note of notes) {
    if (!relevant.has(note.dir)) continue;
    const sym = note.fm.symbol;
    if (!sym) continue;
    const key = String(sym);
    if (!bySymbol.has(key)) bySymbol.set(key, []);
    bySymbol.get(key).push(note.slug);
  }
  const diagnostics = [];
  for (const sym of [...bySymbol.keys()].sort()) {
    const slugs = bySymbol.get(sym).slice().sort();
    if (slugs.length < 2) continue;
    diagnostics.push(makeDiagnostic({
      rule: "symbols",
      target: sym,
      message: `\`${sym}\` claimed by ` + slugs.map((s) => `\`${s}\``).join(", "),
    }));
  }
  return diagnostics;
}


