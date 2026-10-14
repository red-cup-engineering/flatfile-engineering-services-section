import { readMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
import { BADGE_KINDS } from "../../convention.mjs";
import { makeDiagnostic } from "./diagnostic.mjs";

const PROOF_END_RE = /\$\\square\$/;

// A source-format/claim audit, never a proof checker. A Proof heading, terminal
// square and "status: proved" are authored tokens. None checks a Lean
// declaration, its hypotheses, a source revision or an independent receiver.
// The mathematical owner must independently establish proof acceptance.
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
      diagnostics.push(makeDiagnostic({
        rule: "unverified-proof",
        path: note.path,
        slug: note.slug,
        message: "status: proved is an authored claim, not an independently checked derivation at its source revision",
      }));
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


