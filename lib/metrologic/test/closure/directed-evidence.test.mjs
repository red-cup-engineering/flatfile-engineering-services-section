import assert from "node:assert/strict";
import test from "node:test";
import { settleEvidence } from "../../src/closure/directed-evidence.mjs";

const vertices = [
  { id: "a", basis: ["seed", "later"], seed: ["seed"] },
  { id: "b", basis: ["seen", "settled"], seed: [] },
  { id: "c", basis: ["reported"], seed: [] },
];
const edges = [
  { id: "a-b", source: "a", target: "b", map: { seed: ["seen"], later: ["settled"] } },
  { id: "b-c", source: "b", target: "c", map: { settled: ["reported"] } },
];

test("directed finite evidence settles to the least edge-compatible powerset section with witnesses", () => {
  const result = settleEvidence({ vertices, edges });
  assert.deepEqual(result.values, { a: ["seed"], b: ["seen"], c: [] });
  assert.equal(result.iterations, 1);
  assert.equal(result.fixedPoint, true);
  assert.deepEqual(result.witnesses.b.seen, { kind: "edge", edge: "a-b", source: "a", sourceAtoms: ["seed"] });
  assert.deepEqual(result.witnesses.a.seed, { kind: "seed" });
});

test("edge direction matters", () => {
  const forward = settleEvidence({ vertices: vertices.slice(0, 2), edges: [edges[0]] });
  const backward = settleEvidence({ vertices: vertices.slice(0, 2), edges: [{ ...edges[0], source: "b", target: "a", map: { seen: ["later"] } }] });
  assert.deepEqual(forward.values.b, ["seen"]);
  assert.deepEqual(backward.values.a, ["seed"]);
});

test("cycles settle, output is idempotent, and edge order does not change the result", () => {
  const cycle = [
    { id: "a-b", source: "a", target: "b", map: { seed: ["seen"] } },
    { id: "b-a", source: "b", target: "a", map: { seen: ["later"] } },
  ];
  const first = settleEvidence({ vertices: vertices.slice(0, 2), edges: cycle });
  const second = settleEvidence({ vertices: vertices.slice(0, 2).map((vertex) => ({ ...vertex, seed: first.values[vertex.id] })), edges: cycle.slice().reverse() });
  assert.deepEqual(first.values, { a: ["later", "seed"], b: ["seen"] });
  assert.deepEqual(second.values, first.values);
});

test("unknown, escaping, and validator-rejected maps are diagnosed and cannot alter the closure", () => {
  const result = settleEvidence({
    vertices: vertices.slice(0, 2),
    edges: [
      { id: "missing", source: "a", target: "missing", map: {} },
      { id: "escape", source: "a", target: "b", map: { seed: ["outside"] } },
      { id: "validator", source: "a", target: "b", map: { seed: ["seen"] } },
    ],
    validateMap: ({ id }) => id === "validator" ? "policy denies this edge" : true,
  });
  assert.deepEqual(result.values, { a: ["seed"], b: [] });
  assert.deepEqual(result.rejectedEdges.map(({ code }) => code), ["unknown-endpoint", "invalid-map", "rejected-by-validator"]);
});

test("finite table maps are exhaustively bounded and monotone over every source subset", () => {
  const source = ["p", "q"];
  const result = settleEvidence({
    vertices: [{ id: "from", basis: source, seed: source }, { id: "to", basis: ["x", "y"], seed: [] }],
    edges: [{ source: "from", target: "to", map: { p: ["x"], q: ["y"] } }],
  });
  assert.deepEqual(result.values.to, ["x", "y"]);
  for (const subset of [[], ["p"], ["q"], ["p", "q"]]) {
    const partial = settleEvidence({
      vertices: [{ id: "from", basis: source, seed: subset }, { id: "to", basis: ["x", "y"], seed: [] }],
      edges: [{ source: "from", target: "to", map: { p: ["x"], q: ["y"] } }],
    });
    assert.ok(partial.values.to.every((atom) => result.values.to.includes(atom)));
  }
});

test("the finite result is below every compatible assignment above the seed", () => {
  const graph = {
    vertices: [{ id: "a", basis: ["p", "q"], seed: ["p"] }, { id: "b", basis: ["x", "y"], seed: [] }],
    edges: [{ source: "a", target: "b", map: { p: ["x"], q: ["y"] } }],
  };
  const result = settleEvidence(graph);
  const subsets = (atoms) => atoms.flatMap((_, mask) => [mask]).map((mask) => atoms.filter((_, index) => (mask & (1 << index)) !== 0));
  for (const a of subsets(["p", "q"])) for (const b of subsets(["x", "y"])) {
    if (!a.includes("p")) continue;
    const required = a.flatMap((atom) => graph.edges[0].map[atom] ?? []);
    if (!required.every((atom) => b.includes(atom))) continue;
    assert.ok(result.values.a.every((atom) => a.includes(atom)));
    assert.ok(result.values.b.every((atom) => b.includes(atom)));
  }
});

test("reserved property names remain ordinary atoms and validator mutation cannot affect the closure", () => {
  const result = settleEvidence({
    vertices: [{ id: "__proto__", basis: ["constructor"], seed: ["constructor"] }, { id: "toString", basis: ["__proto__"], seed: [] }],
    edges: [{ id: "__proto__", source: "__proto__", target: "toString", map: { constructor: ["__proto__"] } }],
    validateMap: ({ source, target, map }) => {
      assert.throws(() => { source.basis.push("bad"); }, TypeError);
      assert.throws(() => { target.seed.push("bad"); }, TypeError);
      assert.throws(() => { map.constructor.push("bad"); }, TypeError);
      return true;
    },
  });
  assert.deepEqual(Object.keys(result.values), ["__proto__", "toString"]);
  assert.deepEqual(result.values["__proto__"], ["constructor"]);
  assert.deepEqual(result.values.toString, ["__proto__"]);
});

test("duplicate edge ids are rejected so witnesses stay unambiguous", () => {
  const result = settleEvidence({
    vertices: vertices.slice(0, 2),
    edges: [edges[0], { ...edges[0], map: { seed: ["settled"] } }],
  });
  assert.deepEqual(result.values.b, ["seen"]);
  assert.deepEqual(result.rejectedEdges, [{ edge: "a-b", code: "duplicate-edge-id", message: "every accepted edge needs a unique id" }]);
});
