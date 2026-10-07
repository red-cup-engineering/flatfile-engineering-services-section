import { createGraph, cycles as graphCycles } from "@red-cup-engineering/metrologic/models/graphs/directed-multigraph";
import { makeDiagnostic } from "./diagnostic.mjs";

const DEPENDS_ON = "depends-on";

// dependsOn: Map<slug, slug[]> of "depends-on" edges only. bySlug: Map<slug,
// Flatfile[]> used to recover a self-loop's owning path.
export function check(dependsOn, bySlug) {
  const graph = createGraph();
  for (const [src, dsts] of dependsOn) {
    graph.addNode(src);
    for (const dst of dsts) graph.addEdge({ from: src, to: dst, kind: DEPENDS_ON });
  }

  const diagnostics = [];
  for (const cycle of graphCycles(graph, { kind: DEPENDS_ON })) {
    if (cycle.length === 1) {
      const [slug] = cycle;
      const notes = bySlug.get(slug) ?? [];
      diagnostics.push(makeDiagnostic({
        rule: "cycles",
        path: notes[0]?.path ?? null,
        slug,
        target: slug,
        message: `\`${slug}\` lists itself in depends-on (self-loop)`,
      }));
    } else {
      diagnostics.push(makeDiagnostic({
        rule: "cycles",
        message: "cycle in depends-on: " + cycle.map((s) => `\`${s}\``).join(" → "),
      }));
    }
  }
  return diagnostics;
}

