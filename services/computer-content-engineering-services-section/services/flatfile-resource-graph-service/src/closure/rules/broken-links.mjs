import { makeDiagnostic } from "./diagnostic.mjs";

// Body markdown links to .md targets that don't resolve to a known slug.
// Reuses substrate/store.mjs's buildEdges output rather than reparsing
// links: a body edge already carries the source note's slug, the
// resolved target slug, and the source line.
export function check(edges, bySlug, knownSlugs) {
  const diagnostics = [];
  for (const edge of edges) {
    if (edge.source !== "body" || edge.kind !== "link") continue;
    if (knownSlugs.has(edge.dst)) continue;
    const notes = bySlug.get(edge.src) ?? [];
    diagnostics.push(makeDiagnostic({
      rule: "broken-links",
      path: notes[0]?.path ?? null,
      slug: edge.src,
      target: edge.dst,
      message: `references missing slug \`${edge.dst}\``,
    }));
  }
  return diagnostics;
}


