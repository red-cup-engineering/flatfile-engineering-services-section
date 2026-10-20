import assert from "node:assert/strict";
import test from "node:test";
import { createGraph, observedTwoStepPaths } from "../src/models/graphs/directed-multigraph.mjs";

function graph(edges) {
  const source = createGraph();
  for (const { id, from, to } of edges) source.addEdge({ from, to, kind: "generated-step", data: { id } });
  return source;
}

test("observer identification b~c admits A-B-D path while original has no a-d path", () => {
  const original = graph([{ id: "u", from: "a", to: "b" }, { id: "v", from: "c", to: "d" }]);
  const map = { a: "A", b: "B", c: "B", d: "D" };
  const shadow = observedTwoStepPaths(original, id => map[id]);
  assert.equal(shadow.atomic.length, 2);
  assert.deepEqual(shadow.observedVertices, ["A", "B", "D"]);
  assert.equal(shadow.composites.length, 1);
  assert.deepEqual(shadow.composites[0].sourceEdgeIndices, [0, 1]);
  assert.deepEqual(shadow.composites[0].sourceVia, ["b", "c"]);
  assert.equal(shadow.composites[0].sourceComposable, false);
  assert.equal(shadow.composites[0].observationOnly, true);
  assert.equal(shadow.observationOnlyCount, 1);
  assert.equal(shadow.liftedCount, 0);
});

test("faithful observed composability remains source composability", () => {
  const original = graph([{ id: "u", from: "a", to: "b" }, { id: "v", from: "b", to: "d" }]);
  const s = observedTwoStepPaths(original, id => id);
  assert.equal(s.composites.length, 1);
  assert.equal(s.liftedCount, 1);
  assert.equal(s.observationOnlyCount, 0);
  assert.deepEqual(s.composites[0].sourceVia, ["b", "b"]);
});

test("nonidentifying observer does not invent a composite", () => {
  const original = graph([{ id: "u", from: "a", to: "b" }, { id: "v", from: "c", to: "d" }]);
  const s = observedTwoStepPaths(original, id => id);
  assert.deepEqual(s.composites, []);
});

test("same physical source self-loop composes twice, distinct parallel edges remain distinct", () => {
  const original = graph([
    { id: "first", from: "a", to: "a" },
    { id: "parallel", from: "a", to: "a" },
  ]);
  const s = observedTwoStepPaths(original, () => "one");
  assert.deepEqual(s.composites.map(x => x.sourceEdgeIndices), [[0,0],[0,1],[1,0],[1,1]]);
  assert.equal(s.observationOnlyCount, 0);
  assert.equal(s.liftedCount, 4);
  assert.equal(s.atomic[0].data.id, "first");
  assert.equal(s.atomic[1].data.id, "parallel");
});

test("an observer cannot report an absent or unnameable image vertex", () => {
  const original = graph([{ id: "edge", from: "a", to: "b" }]);
  assert.throws(() => observedTwoStepPaths(original, () => ""), /nonempty observed identity/);
  assert.throws(() => observedTwoStepPaths(original, () => null), /nonempty observed identity/);
  assert.throws(() => observedTwoStepPaths(original, null), /original graph and an observer/);
});
