import { makeDiagnostic } from "./diagnostic.mjs";

// A reference (frontmatter relation value or body markdown link) that
// resolves to more than one record. The JS substrate addresses notes by
// slug rather than by path-suffix (gen-1's scheme, ported here as slug
// resolution against the same bySlug index broken-links.mjs checks
// against): zero matches is a broken link, exactly one is resolved, more
// than one is ambiguous.
export function check(edges, bySlug) {
  const diagnostics = [];
  for (const edge of edges) {
    const targets = bySlug.get(edge.dst) ?? [];
    if (targets.length < 2) continue;
    const notes = bySlug.get(edge.src) ?? [];
    const paths = targets.map((note) => note.path).sort();
    diagnostics.push(makeDiagnostic({
      rule: "ambiguous-reference",
      path: notes[0]?.path ?? null,
      slug: edge.src,
      target: edge.dst,
      message: `\`${edge.kind}: ${edge.dst}\` resolves to ${targets.length} records: `
        + paths.map((p) => `\`${p}\``).join(", "),
    }));
  }
  return diagnostics;
}


