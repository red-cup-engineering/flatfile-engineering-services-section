import { RELATION_KEYS } from "../convention.mjs";
import { parseLinks } from "./markdown-links.mjs";
import { makePredication, slugOf } from "./predication.mjs";

// Vendored/build/draft dirs and the never-a-note README.md sentinel, skipped
// at any depth. A caller with a narrower or wider corpus convention passes
// its own excludes.
export const DEFAULT_EXCLUDES = Object.freeze([
  ".git", "node_modules", "public", ".lake", ".venv", "__pycache__",
  "build", "dist", "archetypes", "triage", "README.md",
]);

// Frontmatter relations (depends-on, see-also, ...) become Predications
// with source "fm" and kind = the relation name. Body markdown links to
// ".md" targets become Predications with source "body" and kind "link".
// Visits notes in their given order; within each note, its fm-relation
// edges precede its body-link edges.
export function buildEdges(notes, { sources = ["fm", "body"], relationKeys = RELATION_KEYS } = {}) {
  const wantFm = sources.includes("fm");
  const wantBody = sources.includes("body");
  const out = [];
  for (const note of notes) {
    if (wantFm) {
      for (const key of relationKeys) {
        const value = note.fm[key];
        const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
        for (const item of items) {
          if (typeof item !== "string") continue;
          const dst = slugOf(item);
          if (dst === null) continue;
          out.push(makePredication({ src: note.slug, dst, kind: key, source: "fm" }));
        }
      }
    }
    if (wantBody) {
      for (const link of parseLinks(note.body)) {
        if (link.kind !== "relative" && link.kind !== "absolute") continue;
        const dst = slugOf(link.targetRaw, { requireMd: true });
        if (dst === null) continue;
        out.push(makePredication({ src: note.slug, dst, kind: "link", source: "body", line: link.line }));
      }
    }
  }
  return out;
}


