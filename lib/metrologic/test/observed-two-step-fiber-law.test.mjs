import assert from "node:assert/strict";
import test from "node:test";
import { createGraph, observedTwoStepPaths } from "../src/models/graphs/directed-multigraph.mjs";

/**
 * Independent finite oracle for image-composable ordered SOURCE edge pairs.
 * The graph's native edge identity is kept; quotient endpoints never license
 * source composition. See Obsmetrologia #24 and Metrologic PR #237.
 *
 * C = Σ_o (Σ_{q(u)=o} indeg(u))(Σ_{q(v)=o} outdeg(v))
 * L = Σ_v indeg(v) outdeg(v); G = C - L.
 * This comparison is conditional graph mathematics, NOT a Mark generator.
 */
function fiberCounts(edges, q, n) {
  const incoming = Array(n).fill(0), outgoing = Array(n).fill(0);
  for (const edge of edges) {
    outgoing[Number(edge.from.slice(1))] += 1;
    incoming[Number(edge.to.slice(1))] += 1;
  }
  let observed = 0, lifted = 0;
  for (let u = 0; u < n; u++) {
    lifted += incoming[u] * outgoing[u];
    for (let v = 0; v < n; v++) {
      if (q[u] === q[v]) observed += incoming[u] * outgoing[v];
    }
  }
  return [observed, lifted, observed - lifted];
}

test("finite vertex-observation fiber law matches native image pairs in 13,890 cases", () => {
  let checked = 0;
  for (const n of [1, 2, 3]) {
    const ids = Array.from({ length: n }, (_, i) => `v${i}`);
    const possible = ids.flatMap(from => ids.map(to => ({ from, to })));
    for (let mask = 0; mask < 2 ** possible.length; mask++) {
      const source = createGraph({ nodes: ids.map(id => ({ id })) });
      for (let i = 0; i < possible.length; i++) {
        if ((mask & (1 << i)) !== 0) source.addEdge({
          ...possible[i], kind: "observed-step", data: { sourceEdge: i },
        });
      }
      const edges = source.edges();
      for (let qindex = 0; qindex < n ** n; qindex++) {
        let code = qindex;
        const q = ids.map(() => {
          const value = code % n;
          code = Math.floor(code / n);
          return `o${value}`;
        });
        const image = observedTwoStepPaths(source, id => q[Number(id.slice(1))]);
        const [c, l, g] = fiberCounts(edges, q, n);
        const expectedPairs = [];
        for (let i = 0; i < edges.length; i++) {
          for (let j = 0; j < edges.length; j++) {
            const left = edges[i], right = edges[j];
            if (q[Number(left.to.slice(1))] === q[Number(right.from.slice(1))])
              expectedPairs.push([i, j]);
          }
        }
        assert.deepEqual(
          [image.composites.length, image.liftedCount, image.observationOnlyCount],
          [c, l, g],
          `n=${n}, graph mask=${mask}, observer code=${qindex}`,
        );
        assert.deepEqual(image.composites.map(x => x.sourceEdgeIndices), expectedPairs);
        assert.equal(image.liftedCount + image.observationOnlyCount, image.composites.length);
        checked++;
      }
    }
  }
  assert.equal(checked, 13890);
});

test("non-injective image can add no ghost; parallel source edges can add two", () => {
  const quiet = createGraph();
  quiet.addNode("v1"); // ensure the merged but isolated vertex is genuinely present
  quiet.addEdge({ from: "v0", to: "v2", data: { id: 0 } });
  const quietImage = observedTwoStepPaths(quiet, id => id === "v0" || id === "v1" ? "same" : "other");
  assert.deepEqual([quietImage.composites.length, quietImage.liftedCount, quietImage.observationOnlyCount], [0, 0, 0]);

  const source = createGraph();
  source.addEdge({ from: "v0", to: "v1", data: { id: 0 } });
  source.addEdge({ from: "v0", to: "v1", data: { id: 1 } });
  source.addEdge({ from: "v2", to: "v3", data: { id: 2 } });
  const image = observedTwoStepPaths(source, id => ({ v0: "A", v1: "B", v2: "B", v3: "D" })[id]);
  assert.deepEqual([image.composites.length, image.liftedCount, image.observationOnlyCount], [2, 0, 2]);
  assert.deepEqual(image.composites.map(x => x.sourceEdgeIndices), [[0, 2], [1, 2]]);
  assert.ok(image.composites.every(x => x.observationOnly && !x.sourceComposable));
});

test("same observed self-loop need not license composition of its original edge with itself", () => {
  const source = createGraph();
  source.addEdge({ from: "v0", to: "v1" });
  const image = observedTwoStepPaths(source, () => "one");
  assert.deepEqual([image.composites.length, image.liftedCount, image.observationOnlyCount], [1, 0, 1]);
  assert.deepEqual(image.composites[0].sourceVia, ["v1", "v0"]);
});
