/**
 * Module symbol cohesion as a persistent-H0 read (see `persistent-h0.mts`).
 *
 * A source module's own top-level declarations are the vertex set.
 * Internal cross-reference (one declaration's body naming another) is the
 * strong-evidence filtration stage; consumer co-import (two declarations
 * imported together by the same other module) is the weak-evidence stage
 * union'd on top. A module whose components have not merged to one by the
 * weak stage is exporting more than one object through a single file —
 * Part I.1 rules 1-3 of the packaging law, computed rather than eyeballed
 * from line or function count.
 */
import { componentPartitions, graphFiltration } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/persistent-h0";
import {
  readingOfEvidenceRecord,
  evidenceRecord,
  evidenceRecordTopMass,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/evidence-record";

/** Record-valued evidence for the claim that one module contains one connected responsibility. */

function edgeKey([source, target]) {
  return source <= target ? `${source}|${target}` : `${target}|${source}`;
}

function unionEdges(left, right) {
  // Every entry of `left` (including a mutually-referencing pair's two
  // opposite-direction edges) must survive unchanged and undeduplicated, so
  // that `left` stays a literal subset of the result — persistent-h0's
  // monotonicity check compares directed tuples, not undirected connectivity.
  const result = [...left];
  const covered = new Set(left.map(edgeKey));
  for (const edge of right) {
    const key = edgeKey(edge);
    if (!covered.has(key)) {
      covered.add(key);
      result.push(edge);
    }
  }
  return Object.freeze(result);
}

/**
 * Read one module's declaration graph as a two-stage filtration and its H0
 * partition.
 *
 * @remarks Uses `componentPartitions` (union-find, O(V+E) per stage) rather
 * than `persistentH0Receipt`. The receipt's own transitivity/monotonicity
 * self-certification is O(stages · V³) path-connectivity checks over
 * `pathConnected`, each itself O(V+E) — true by construction for any
 * union-find filtration with monotone edge stages, but prohibitively
 * expensive to re-verify at module scale (hundreds of top-level
 * declarations). `graphFiltration`'s own construction already enforces the
 * monotone-edge-superset law that makes the certificate provable; this
 * function reads the (already-lawful) partition without re-proving it.
 */
export function moduleCohesionReceipt(graph) {
  const stage0 = graph.internalReferenceEdges;
  const stage1 = unionEdges(graph.internalReferenceEdges, graph.coImportEdges);
  const filtration = graphFiltration(graph.symbols, [stage0, stage1]);
  const partitions = componentPartitions(filtration);
  const finalStage = partitions[partitions.length - 1];
  const components = finalStage?.components ?? graph.symbols.map((symbol) => Object.freeze([symbol]));
  const record = evidenceRecord(
    partitions.reduce((sum, partition) => sum + Math.max(0, graph.symbols.length - partition.componentCount), 0),
    partitions.reduce((sum, partition) => sum + Math.max(0, partition.componentCount - 1), 0),
  );
  return Object.freeze({
    kind: "metroplat.module-cohesion.receipt:witness",
    path: graph.path,
    partitions,
    componentCount: finalStage?.componentCount ?? graph.symbols.length,
    components,
    valuation: Object.freeze({
      kind: "metroplat.module-cohesion.valuation",
      record,
      reading: readingOfEvidenceRecord(record),
      topMass: evidenceRecordTopMass(record),
      evidence: Object.freeze(partitions.map((partition) =>
        `filtration-stage:${partition.stage};connected-merges:${Math.max(0, graph.symbols.length - partition.componentCount)};residual-separations:${Math.max(0, partition.componentCount - 1)}`,
      )),
    }),
  });
}
