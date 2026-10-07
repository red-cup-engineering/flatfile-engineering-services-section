import { makeDiagnostic } from "./diagnostic.mjs";

// Body length excluding heading lines and blank lines — the "real prose"
// measurement, so heading scaffolding doesn't count toward substance.
function bodyChars(body) {
  let total = 0;
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    total += line.length;
  }
  return total;
}

const DEFAULT_EXCLUDE_KINDS = Object.freeze(["narrative"]);

// Notes whose body is below a character threshold. Excludes narrative
// notes by default — those are positional/structural and may
// legitimately be short.
export function check(notes, { minChars = 200, excludeKinds = DEFAULT_EXCLUDE_KINDS } = {}) {
  const exclude = new Set(excludeKinds);
  const diagnostics = [];
  for (const note of notes) {
    if (exclude.has(note.kind)) continue;
    const chars = bodyChars(note.body);
    if (chars < minChars) {
      diagnostics.push(makeDiagnostic({
        rule: "stubs",
        path: note.path,
        slug: note.slug,
        message: `\`${note.slug}\` (${note.kind}, ${chars} chars)`,
      }));
    }
  }
  return diagnostics;
}


