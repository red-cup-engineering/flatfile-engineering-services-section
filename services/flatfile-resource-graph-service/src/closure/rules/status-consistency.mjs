import { UNPROVED } from "../../convention.mjs";
import { makeDiagnostic } from "./diagnostic.mjs";

// A proved note must not depend on a draft/sketch/wip note — otherwise
// the proved claim is conditional on unproved work, a hidden gap in the
// proof DAG.
export function check(notes, bySlug) {
  const diagnostics = [];
  for (const note of notes) {
    if (note.fm.status !== "proved") continue;
    const deps = note.fm["depends-on"];
    const items = Array.isArray(deps) ? deps : [];
    for (const dep of items) {
      if (typeof dep !== "string") continue;
      const depNotes = bySlug.get(dep) ?? [];
      if (depNotes.length === 0) continue;
      const depStatus = depNotes[0].fm.status;
      if (UNPROVED.has(depStatus)) {
        diagnostics.push(makeDiagnostic({
          rule: "status-consistency",
          path: note.path,
          slug: note.slug,
          target: dep,
          message: `\`${note.slug}\` (proved) depends on \`${dep}\` (${depStatus})`,
        }));
      }
    }
  }
  return diagnostics;
}


