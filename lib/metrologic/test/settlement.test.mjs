import { test } from "node:test";
import assert from "node:assert/strict";
import {
  settle,
  settlementAlgebra,
  readingCellAlgebra,
  readingSettlement,
  orbitMonotone,
  SettlingMonotonicityViolation,
  SettlementDivergence,
} from "../src/settlement.mjs";
import { readSettling, writeSettling, readOrbit } from "../src/settlement-wire.mjs";
import {
  samePoint,
} from "@red-cup-engineering/computer-data-services-section/four";
import mergeSetOfSettlings from "../scripts/merge-set-of-settlings.mjs";
import checkSettlingOrbit from "../scripts/check-settling-orbit.mjs";

const bot = "absurd";
const t = "potential";
const f = "active";
const top = "stable";

// === the generic combinator ====================================================================

test("settle: is carrier-generic — it computes a fixed point over any supplied semilattice", () => {
  // the powerset semilattice on integers: merge is union, equal is set equality
  const merge = (a, b) => new Set([...a, ...b]);
  const equal = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  const step = (s) => new Set([...s].flatMap((x) => (x < 8 ? [x, x * 2] : [x])));
  const { state, iterations } = settle(step, new Set([1]), { merge, equal });
  assert.deepEqual([...state].sort((a, b) => a - b), [1, 2, 4, 8]);
  assert.equal(iterations, 3);
});

test("settle: refuses to run without the carrier's semilattice", () => {
  assert.throws(() => settle((x) => x, {}, {}), TypeError);
  assert.throws(() => settle((x) => x, {}, { merge: (a) => a }), TypeError);
});

test("settle: a step that never converges exhausts the budget and raises SettlementDivergence", () => {
  const merge = (a, b) => a + b;
  const equal = (a, b) => a === b;
  assert.throws(() => settle((n) => n + 1, 0, { merge, equal, maxIter: 5 }), SettlementDivergence);
});

test("settle: the divergence message is the caller's when one is supplied", () => {
  assert.throws(
    () => settle((n) => n + 1, 0, { merge: (a, b) => a + b, equal: (a, b) => a === b, maxIter: 3, divergenceMessage: "no fixed point" }),
    /no fixed point/,
  );
});

test("settle: step never sees the caller's own start value by reference", () => {
  const seen = [];
  const start = { a: t };
  readingSettlement.settle((state) => { seen.push(state); return state; }, start);
  assert.notEqual(seen[0], start);
  assert.ok(samePoint(seen[0].a, t));
});

// === the settling algebra ======================================================================

test("mergeSettling: is the pointwise knowledge-join, missing keys defaulting to bottom", () => {
  const merged = readingSettlement.merge({ a: t, b: bot }, { a: f, c: top });
  assert.equal(merged.a, "stable");
  assert.equal(merged.b, "absurd");
  assert.equal(merged.c, "stable");
});

test("merge: is a semilattice — commutative, associative, idempotent", () => {
  const x = { a: t, b: bot };
  const y = { a: f, c: t };
  const z = { b: top };
  const eq = readingSettlement.equalSettling;
  assert.ok(eq(readingSettlement.merge(x, y), readingSettlement.merge(y, x)));
  assert.ok(eq(
    readingSettlement.merge(readingSettlement.merge(x, y), z),
    readingSettlement.merge(x, readingSettlement.merge(y, z)),
  ));
  assert.ok(eq(readingSettlement.merge(x, x), x));
});

test("mergeAll: folds merge with the empty settling as unit", () => {
  assert.deepEqual(readingSettlement.mergeAll([]), {});
  const merged = readingSettlement.mergeAll([{ a: t }, { a: f }, { b: t }]);
  assert.equal(merged.a, "stable");
  assert.equal(merged.b, "potential");
});

test("settle: reaches the least fixed point of a knowledge-monotone inflationary step", () => {
  // each round, whatever cell "a" knows is copied into "b"
  const step = (state) => ({ b: state.a ?? bot });
  const { state, iterations } = readingSettlement.settle((s) => step(s), { a: t });
  assert.equal(state.a, "potential");
  assert.equal(state.b, "potential");
  assert.equal(iterations, 1);
});

test("settle: an already-settled start converges at iteration 0", () => {
  const { iterations } = readingSettlement.settle((s) => s, { a: top });
  assert.equal(iterations, 0);
});

// === the monotonicity gate =====================================================================

test("orbitMonotone: true on a climbing orbit, false on any backward move", () => {
  assert.ok(readingSettlement.orbitMonotone([bot, t, top]));
  assert.ok(readingSettlement.orbitMonotone([bot, bot, top, top]));
  assert.equal(readingSettlement.orbitMonotone([top, t]), false);
  assert.equal(readingSettlement.orbitMonotone([t, f]), false); // t and f are incomparable
});

test("orbitMonotone: the bare form demands the caller's order", () => {
  assert.throws(() => orbitMonotone([1, 2]), TypeError);
  assert.ok(orbitMonotone([1, 2, 2, 3], { leq: (a, b) => a <= b }));
});

test("assertSettlingMonotone: raises SettlingMonotonicityViolation naming the target", () => {
  assert.throws(
    () => readingSettlement.assertSettlingMonotone([top, t], { target: "cell-9" }),
    (error) => error instanceof SettlingMonotonicityViolation
      && error.code === "settling-monotonicity-violation"
      && /cell-9/.test(error.message),
  );
});

test("guardSettlingMonotone: judges one step as a two-point orbit", () => {
  readingSettlement.guardSettlingMonotone(t, top, { cell: "x" });
  assert.throws(() => readingSettlement.guardSettlingMonotone(top, t, { cell: "x" }), SettlingMonotonicityViolation);
});

// === CellSettlement ============================================================================

test("CellSettlement: an unwritten cell reads bottom", () => {
  const settlement = new readingSettlement.CellSettlement();
  assert.equal(settlement.valueOf("nowhere"), "absurd");
});

test("CellSettlement: every write only advances, and a backward write is refused", () => {
  const settlement = new readingSettlement.CellSettlement();
  settlement.write("x", t);
  settlement.write("x", top);
  assert.equal(settlement.valueOf("x"), "stable");
  assert.throws(() => settlement.write("x", t), SettlingMonotonicityViolation);
  assert.equal(settlement.valueOf("x"), "stable");
});

test("CellSettlement: judges against its own accumulated state, not a caller's claim", () => {
  const settlement = new readingSettlement.CellSettlement();
  settlement.write("x", top);
  // a caller reporting it is only moving bottom -> potential is still refused
  assert.throws(() => settlement.write("x", t), SettlingMonotonicityViolation);
});

// === the parameterization ======================================================================

test("settlementAlgebra: lifts any cell algebra — a Map-held carrier over a numeric fiber", () => {
  const heights = settlementAlgebra({
    join: (a, b) => Math.max(a, b),
    equal: (a, b) => a === b,
    bottom: 0,
    container: "map",
  });
  const merged = heights.merge(new Map([["a", 1]]), new Map([["a", 2], ["b", 1]]));
  assert.ok(merged instanceof Map);
  assert.equal(merged.get("a"), 2);
  assert.equal(merged.get("b"), 1);
  const { state } = heights.settle((m) => new Map([...m].map(([k, v]) => [k, Math.min(v + 1, 3)])), new Map([["a", 0]]));
  assert.equal(state.get("a"), 3);
});

test("settlementAlgebra: a cell may be named for a prototype member", () => {
  for (const cell of ["toString", "constructor", "__proto__"]) {
    const merged = readingSettlement.merge({ [cell]: t }, { [cell]: f });
    assert.equal(merged[cell], "stable");
    assert.deepEqual(Object.keys(merged), [cell]);
    const settlement = new readingSettlement.CellSettlement();
    assert.equal(settlement.valueOf(cell), "absurd");
    settlement.write(cell, top);
    assert.throws(() => settlement.write(cell, t), SettlingMonotonicityViolation);
  }
});

test("settlementAlgebra: refuses an incomplete cell algebra or an unknown container", () => {
  assert.throws(() => settlementAlgebra({}), TypeError);
  assert.throws(() => settlementAlgebra({ join: (a) => a, equal: (a) => a }), TypeError);
  assert.throws(() => settlementAlgebra({ ...readingCellAlgebra, container: "tree" }), TypeError);
});

test("readingCellAlgebra: is the data layer's FOUR algebra, not a second copy", () => {
  assert.equal(readingCellAlgebra.bottom, "absurd");
  assert.equal(readingCellAlgebra.join(t, f), "stable");
  assert.ok(readingCellAlgebra.equal(t, "potential"));
});

// === the wire reading and the scripts ==========================================================

test("readSettling/writeSettling: round-trip a wire settling", () => {
  const wire = { a: "potential", b: "absurd", c: "stable" };
  assert.deepEqual(writeSettling(readSettling(wire)), wire);
});

test("readSettling: refuses a non-record and an unknown charge value name", () => {
  assert.throws(() => readSettling([]), TypeError);
  assert.throws(() => readSettling({ a: "maybe" }));
});

test("readOrbit: decodes a list of charge value names", () => {
  assert.equal(readOrbit(["absurd", "stable"]).length, 2);
  assert.throws(() => readOrbit({}), TypeError);
});

test("merge-set-of-settlings: folds the wire settlings pointwise", () => {
  assert.deepEqual(
    mergeSetOfSettlings([{ a: "potential" }, { a: "active", b: "potential" }]),
    { a: "stable", b: "potential" },
  );
  assert.deepEqual(mergeSetOfSettlings([]), {});
  assert.throws(() => mergeSetOfSettlings({}), TypeError);
});

test("check-settling-orbit: reports the verdict over a named cell", () => {
  assert.deepEqual(checkSettlingOrbit(["absurd", "potential", "stable"], { cell: "x" }), {
    cell: "x", length: 3, monotone: true,
  });
  assert.equal(checkSettlingOrbit(["stable", "potential"]).monotone, false);
});
