import { readMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
import { BADGE_KINDS } from "../../convention.mjs";
import { makeDiagnostic } from "./diagnostic.mjs";

const PROOF_END_RE = /\$\\square\$/;

// Theorem-like notes carry a status; proved ones have a Proof section
// ending with a $\square$ marker. Three distinct rule names — matching
// pyfars.closure.rule.proofs's three Diagnostic codes verbatim, for
// cross-language conformance (design spec section 11, vector #4) —
// rather than one collapsed "proofs" name, since the three conditions
// are semantically distinct problems (no status at all, a proved claim
// missing its proof, an in-progress proof).
export function check(notes) {
  const diagnostics = [];
  for (const note of notes) {
    if (!BADGE_KINDS.has(note.kind)) continue;
    const status = note.fm.status;
    if (!status) {
      diagnostics.push(makeDiagnostic({
        rule: "missing-status",
        path: note.path,
        slug: note.slug,
        message: `\`${note.slug}\` (${note.kind}) has no status`,
      }));
      continue;
    }
    if (status === "proved") {
      if (!readMarkdownStructure(note.body).headings.some(({ level, title }) => level >= 2 && title.startsWith("Proof"))) {
        diagnostics.push(makeDiagnostic({
          rule: "missing-proof",
          path: note.path,
          slug: note.slug,
          message: "status: proved — no Proof heading",
        }));
      } else if (!PROOF_END_RE.test(note.body)) {
        diagnostics.push(makeDiagnostic({
          rule: "missing-proof",
          path: note.path,
          slug: note.slug,
          message: "status: proved — no $\\square$ marker",
        }));
      }
    } else if (status === "sketch" || status === "draft") {
      diagnostics.push(makeDiagnostic({
        rule: "wip-theorem",
        path: note.path,
        slug: note.slug,
        message: `\`${note.slug}\` — ${status}`,
      }));
    } else {
      diagnostics.push(makeDiagnostic({
        rule: "missing-status",
        path: note.path,
        slug: note.slug,
        message: `\`${note.slug}\` has unrecognized status \`${status}\``,
      }));
    }
  }
  return diagnostics;
}


