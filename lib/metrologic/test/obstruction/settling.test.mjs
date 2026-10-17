// settling — structural and property tests for the temporal firing cohomology (settling, increments,
// firings, nscFirings, h1, clInv, mldEquivalent, classify, depth), built exactly to the definition in
// settling.mjs: a SETTLING is a monotone sequence of stages; H¹ is the free abelian group on the cells
// first designated at a LIMIT stage.
//
// The four hand-built regimes (finite / scott / transfinite / aperiodic) are the same four regimes
// Obsmetrologia/Closure/Regime.lean formalizes as `ClosureRegime` (strict / scott / transfiniteBounded /
// aperiodic) and Obsmetrologia/Closure/Ordinal.lean's `regimeOfOrd` reads off the real ordinal shape.
// Obsmetrologia/Cohomology/SettlingCohomologyH1.lean's load-bearing fact — "H¹ = 0 exactly the cascade
// settling," gated by `ClosureOrdinalRegime.cohomologyVanishes_iff : H¹ = 0 ⟺ regime ∈ {strict, scott}" —
// is what the finite/scott vs transfinite/aperiodic split below is checking on the JS side.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  settling, increments, firings, nscFirings, h1, clInv, mldEquivalent, classify, depth,
  filtration, limitStages, nonScottFirings, firstCohomology, gradedGap, closureInvariant, closureEquivalent,
} from "../../src/obstruction/settling.mjs";

const id = () => randomBytes(3).toString("hex");
const rbool = () => (randomBytes(1)[0] & 1) === 1;
const N = 100;

// ── construction / validation ───────────────────────────────────────────────────────────────────────

test("settling: rejects an empty stage list", () => {
  assert.throws(() => settling([]), TypeError);
});

test("settling: rejects stage 0 as a limit ordinal", () => {
  assert.throws(() => settling([{ designated: [id()], limit: true }]), TypeError);
});

test("settling: rejects a stage that drops a cell — knowledge must only accumulate", () => {
  const a = id(), b = id();
  assert.throws(() => settling([{ designated: [a, b] }, { designated: [a] }]), TypeError);
});

test("settling: dedups repeated cells within a stage's designated list", () => {
  const a = id();
  const v = settling([{ designated: [a, a, a] }]);
  assert.deepEqual(v.stages[0].designated, [a]);
});

test("settling: accepts a single stage — the minimal settling", () => {
  const a = id();
  const v = settling([{ designated: [a] }]);
  assert.equal(v.stages.length, 1);
  assert.equal(v.stages[0].limit, false);
});

test("settling: carries `cofinal` only when declared", () => {
  const a = id();
  const plain = settling([{ designated: [a] }]);
  const cofinal = settling([{ designated: [a] }], { cofinal: "uncountable" });
  assert.equal("cofinal" in plain, false);
  assert.equal(cofinal.cofinal, "uncountable");
});

// ── increments / firings / nscFirings ───────────────────────────────────────────────────────────────

test("increments: Δ⁺_τ = D_τ \\ D_{<τ}, stage 0's increment is its own designated set", () => {
  const a = id(), b = id(), c = id();
  const v = settling([
    { designated: [a] },
    { designated: [a, b] },
    { designated: [a, b] }, // no growth
    { designated: [a, b, c] },
  ]);
  const incs = increments(v);
  assert.deepEqual(incs.map((d) => d.added), [[a], [b], [], [c]]);
  assert.deepEqual(incs.map((d) => d.stage), [0, 1, 2, 3]);
});

test("firings: exactly the stages with a non-empty increment", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a] }, { designated: [a, b] }]);
  assert.deepEqual(firings(v).map((d) => d.stage), [0, 2]);
});

test("nscFirings: the subset of firings at a limit stage", () => {
  const a = id(), b = id(), c = id();
  const v = settling([
    { designated: [a] },
    { designated: [a, b], limit: true },
    { designated: [a, b, c] },
  ]);
  assert.deepEqual(firings(v).map((d) => d.stage), [0, 1, 2]);
  assert.deepEqual(nscFirings(v).map((d) => d.stage), [1]);
});

test("nscFirings: empty when no firing lands on a limit stage (a limit stage with nothing new is not NSC)", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a, b] }, { designated: [a, b], limit: true }]);
  assert.deepEqual(nscFirings(v), []);
});

// ── classify: the four regimes ──────────────────────────────────────────────────────────────────────

test("classify: finite regime — no limit stage at all, κ < ω", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a, b] }]);
  const c = classify(v);
  assert.equal(c.regime, "strict");
});

test("classify: scott regime — a limit stage present, but nothing newly designated at it (κ = ω)", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a, b] }, { designated: [a, b], limit: true }]);
  const c = classify(v);
  assert.equal(c.regime, "scott");
  assert.equal(c.depth, 1); // the last actual firing, stage 1 — the limit stage 2 fired nothing
});

test("classify: transfinite regime — a non-Scott-continuous firing at a countable limit (ω < κ < ω₁)", () => {
  const a = id(), b = id(), cc = id();
  const v = settling([
    { designated: [a] },
    { designated: [a, b], limit: true },
    { designated: [a, b, cc] },
  ]);
  const c = classify(v);
  assert.equal(c.regime, "transfinite-bounded");
  assert.equal(c.depth, 2);
});

test("classify: aperiodic regime — declared ω₁-cofinal via `cofinal: \"uncountable\"`", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a, b], limit: true }], { cofinal: "uncountable" });
  assert.equal(classify(v).regime, "aperiodic");
});

test("classify: `cofinal: \"uncountable\"` alone does not force aperiodic — it still needs an NSC firing", () => {
  // a settling with a limit stage that fires nothing stays scott-shaped even if cofinal is declared,
  // because classify only reads `cofinal` in the `hasNsc` branch.
  const a = id();
  const v = settling([{ designated: [a] }, { designated: [a], limit: true }], { cofinal: "uncountable" });
  assert.equal(classify(v).regime, "scott");
});

test("depth: the last firing stage, alone", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a] }, { designated: [a, b] }]);
  assert.equal(depth(v), classify(v).depth);
  assert.equal(depth(v), 2);
});

// ── h1: the temporal firing cohomology ──────────────────────────────────────────────────────────────

test("h1: rank counts exactly the cells first designated at a limit stage", () => {
  const a = id(), b = id(), c = id(), d = id();
  const v = settling([
    { designated: [a] },
    { designated: [a, b, c], limit: true }, // two cells fire together at the limit
    { designated: [a, b, c, d] },
  ]);
  const r = h1(v);
  assert.equal(r.rank, 2);
  assert.equal(r.degree, 1);
  assert.equal(r.vanishes, false);
  assert.deepEqual(new Set(r.generators.map((g) => g.cell)), new Set([b, c]));
  assert.ok(r.generators.every((g) => g.stage === 1));
});

test("h1: vanishes for every finite (no-limit) settling — the strict regime, over many random trials", () => {
  for (let i = 0; i < N; i++) {
    const nStages = 1 + (randomBytes(1)[0] % 6);
    let acc = [];
    const stages = [];
    for (let s = 0; s < nStages; s++) {
      if (rbool()) acc = [...acc, id()];
      stages.push({ designated: acc });
    }
    const v = settling(stages);
    assert.equal(classify(v).regime, "strict");
    assert.equal(h1(v).vanishes, true, "strict regime must have H¹ = 0 (SettlingCohomologyH1.lean)");
  }
});

test("h1: vanishes for the scott regime (a limit that fires nothing)", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a, b] }, { designated: [a, b], limit: true }]);
  assert.equal(classify(v).regime, "scott");
  assert.equal(h1(v).vanishes, true);
});

test("h1: does not vanish for the transfinite regime", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a, b], limit: true }]);
  assert.equal(classify(v).regime, "transfinite-bounded");
  assert.equal(h1(v).vanishes, false);
});

// ── clInv / mldEquivalent ────────────────────────────────────────────────────────────────────────────

test("clInv/mldEquivalent: shift-invariant — inserting a non-firing stage before the limit preserves the class", () => {
  const x = id(), y = id(), z = id();
  const a = settling([{ designated: [x] }, { designated: [x, y], limit: true }, { designated: [x, y, z] }]);
  const b = settling([
    { designated: [x] },
    { designated: [x] }, // an inserted non-firing stage — a settling-shift
    { designated: [x, y], limit: true },
    { designated: [x, y, z] },
  ]);
  assert.equal(clInv(a), clInv(b));
  assert.equal(mldEquivalent(a, b), true);
});

test("clInv/mldEquivalent: settlings whose limit-stage firings name different cells are NOT MLD-equivalent", () => {
  const a = settling([{ designated: ["x"] }, { designated: ["x", "y"], limit: true }]);
  const b = settling([{ designated: ["p"] }, { designated: ["p", "q"], limit: true }]);
  assert.notEqual(clInv(a), clInv(b));
  assert.equal(mldEquivalent(a, b), false);
});

test("clInv/mldEquivalent: two finite (no-limit) settlings are always MLD-equivalent (both cl-inv = '[]')", () => {
  const p = id(), q = id(), r2 = id(), s = id();
  const a = settling([{ designated: [p] }]);
  const b = settling([{ designated: [q, r2] }, { designated: [q, r2, s] }]);
  assert.equal(clInv(a), "[]");
  assert.equal(clInv(a), clInv(b));
  assert.equal(mldEquivalent(a, b), true);
});

// ── the presented form: filtration, over carriers compared by content identity ─────────────────────

test("filtration: carriers coincide by content, not by JSON text (key order does not matter)", () => {
  const f = filtration([
    { ordinal: 0, shape: "initial", designated: [{ a: 1, b: 2 }, { b: 2, a: 1 }] },
    { ordinal: 1, shape: "successor", designated: [{ b: 2, a: 1 }, "x"] },
  ]);
  assert.equal(f.stages[0].designated.length, 1);
  assert.deepEqual(increments(f).map((d) => d.added.length), [1, 1]);
});

test("filtration: refuses no stages, a non-initial stage 0, a bad cofinality and dropped cells", () => {
  assert.throws(() => filtration([]), TypeError);
  assert.throws(() => filtration([{ ordinal: 0, shape: "successor", designated: [] }]), TypeError);
  assert.throws(() => filtration([{ ordinal: 0, shape: "initial", designated: [] }], "big"), TypeError);
  assert.throws(() => filtration([
    { ordinal: 0, shape: "initial", designated: ["a", "b"] },
    { ordinal: 1, shape: "successor", designated: ["a"] },
  ]), TypeError);
});

test("filtration: first cohomology, graded gap, closure invariant and the regime over ordinals", () => {
  const f = filtration([
    { ordinal: 0, shape: "initial", designated: ["a"] },
    { ordinal: 1, shape: "successor", designated: ["a", "b"] },
    { ordinal: "ω", shape: "limit", designated: ["a", "b", "c", "d"] },
  ]);
  assert.equal(limitStages(f).length, 1);
  assert.equal(nonScottFirings(f).length, 1);
  const h = firstCohomology(f);
  assert.equal(h.degree, 1);
  assert.equal(h.rank, 2);
  assert.deepEqual(h.generators.map((g) => g.cell), ["c", "d"]);
  assert.equal(gradedGap(f).rank, h.rank);
  assert.deepEqual(closureInvariant(f).nonScottAdditions.map((s) => s.stage), ["ω"]);
  const c = classify(f);
  assert.equal(c.regime, "transfinite-bounded");
  assert.equal(c.depth, "ω");
  assert.equal(classify(filtration(f.stages, "uncountable")).regime, "aperiodic");
});

test("closureEquivalent: up to settling-shift, by content identity", () => {
  const a = filtration([
    { ordinal: 0, shape: "initial", designated: [{ k: 1 }] },
    { ordinal: 1, shape: "limit", designated: [{ k: 1 }, { m: 2 }] },
  ]);
  const b = filtration([
    { ordinal: 0, shape: "initial", designated: [{ k: 1 }] },
    { ordinal: 1, shape: "successor", designated: [{ k: 1 }] },
    { ordinal: 5, shape: "limit", designated: [{ k: 1 }, { m: 2 }] },
  ]);
  assert.equal(closureEquivalent(a, b), true);
  assert.equal(closureEquivalent(a, settling([{ designated: [1] }, { designated: [1, 3], limit: true }])), false);
});
