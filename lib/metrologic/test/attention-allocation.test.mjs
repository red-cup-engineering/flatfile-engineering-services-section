import assert from "node:assert/strict";
import { test } from "node:test";

import { allocateAttention, allocateBudget, computeAllocation } from "../src/obstruction/attention-allocation.mjs";

test("the exact optimum is chosen within budget", () => {
  const result = computeAllocation({
    budget: 5,
    candidates: [
      { id: "a", cost: 2, benefit: 5 },
      { id: "b", cost: 3, benefit: 6 },
      { id: "c", cost: 5, benefit: 9 },
    ],
  });
  assert.deepEqual(result.funded, ["a", "b"]);
  assert.equal(result.totalCost, 5);
  assert.equal(result.totalBenefit, 11);
  assert.equal(result.consideredCount, 3);
  assert.equal(result.fundedCount, 2);
  assert.equal(result.choiceBits, 0);
  assert.equal(result.exact, true);
  assert.equal(result.theoremReceipt.theorems[0], "Obsmetrologia.Cohomology.Attention.solveL_feasible");
});

test("a tighter budget funds only the single affordable candidate", () => {
  const result = computeAllocation({
    budget: 4,
    candidates: [
      { id: "a", cost: 2, benefit: 5 },
      { id: "b", cost: 3, benefit: 6 },
    ],
  });
  assert.deepEqual(result.funded, ["b"]);
  assert.equal(result.totalBenefit, 6);
  assert.equal(result.exact, true);
});

test("budget below every cost funds nothing", () => {
  const result = computeAllocation({
    budget: 1,
    candidates: [{ id: "a", cost: 2, benefit: 5 }],
  });
  assert.deepEqual(result.funded, []);
  assert.equal(result.totalCost, 0);
  assert.equal(result.choiceBits, 0);
});

test("an exact tie is disclosed as a positive choiceBits", () => {
  const result = computeAllocation({
    budget: 3,
    candidates: [
      { id: "a", cost: 3, benefit: 9 },
      { id: "b", cost: 3, benefit: 9 },
    ],
  });
  assert.equal(result.totalBenefit, 9);
  assert.equal(result.fundedCount, 1);
  assert.equal(result.choiceBits, 1);
});

test("above the exact-enumeration limit the greedy fallback runs and does not claim exactness", () => {
  const candidates = Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, cost: i + 1, benefit: (i + 1) * 2 }));
  const result = computeAllocation({ budget: 1000, candidates });
  assert.equal(result.exact, false);
  assert.equal(result.choiceBits, null);
  assert.equal(result.theoremReceipt, null);
});

test("inadmissible requests are refused", () => {
  assert.throws(() => computeAllocation({ budget: 0, candidates: [{ id: "a", cost: 1, benefit: 1 }] }), /positive finite number/);
  assert.throws(() => computeAllocation({ budget: 5, candidates: [] }), /non-empty list/);
  assert.throws(() => computeAllocation({ budget: 5, candidates: [{ id: "a", cost: -1, benefit: 1 }] }), /positive finite cost/);
  assert.throws(() => computeAllocation({ budget: 5, candidates: [{ id: "a", cost: 1, benefit: 1 }, { id: "a", cost: 2, benefit: 2 }] }), /duplicate candidate id/);
});

test("allocateBudget filters non-positive or non-finite candidates before allocating", () => {
  const result = allocateBudget([
    { id: "a", cost: 1, benefit: 2 },
    { id: "bad-cost", cost: 0, benefit: 5 },
    { id: "bad-benefit", cost: 1, benefit: -1 },
    { id: "bad-finite", cost: Infinity, benefit: 3 },
  ], 10);
  assert.deepEqual(result.funded, ["a"]);
});

test("public numeric exact computation never leaks a theorem receipt outside Nat premises", () => {
  const result = allocateBudget([{ id: "fraction", cost: 1.5, benefit: 2.5 }], 2.5);
  assert.equal(result.exact, true);
  assert.equal(result.theoremReceipt, null);
});

test("unsafe aggregate suppresses theorem receipt", () => {
  const result = allocateBudget([{ id: "a", cost: Number.MAX_SAFE_INTEGER, benefit: 1 }, { id: "b", cost: 1, benefit: 1 }], Number.MAX_SAFE_INTEGER);
  assert.equal(result.theoremReceipt, null);
});

test("Lean solveL chirality keeps the second equal-benefit bead", () => {
  const result = computeAllocation({ budget: 2, candidates: [{ id: "bead1", cost: 1, benefit: 5 }, { id: "bead2", cost: 2, benefit: 5 }] });
  assert.deepEqual(result.funded, ["bead2"]);
});

test("allocateAttention rejects a paid ID alias instead of exceeding the budget", () => {
  assert.throws(() => allocateAttention({
    budget: 1,
    obstructions: [{ id: "x", cost: 1, benefit: 5 }, { id: "x", cost: 10, benefit: 6 }],
  }), { name: "TypeError", message: "duplicate obstruction id x" });
});

test("allocateAttention rejects a free/paid ID alias even at zero budget", () => {
  assert.throws(() => allocateAttention({
    budget: 0,
    obstructions: [{ id: "x", cost: 0, benefit: 5 }, { id: "x", cost: 10, benefit: 6 }],
  }), { name: "TypeError", message: "duplicate obstruction id x" });
});

test("allocateAttention rejects identical records and repeated object references", () => {
  const obstruction = Object.freeze({ id: "x", cost: 1, benefit: 5 });
  for (const obstructions of [[obstruction, { ...obstruction }], [obstruction, obstruction]]) {
    assert.throws(() => allocateAttention({ budget: 2, obstructions: Object.freeze(obstructions) }),
      { name: "TypeError", message: "duplicate obstruction id x" });
  }
});

test("allocateAttention validates uniqueness before filtering free or zero-benefit records", () => {
  const records = [];
  for (let cost = 0; cost <= 2; cost += 1) {
    for (let benefit = 0; benefit <= 2; benefit += 1) records.push({ id: "x", cost, benefit });
  }
  let checked = 0;
  for (const first of records) {
    for (const second of records) {
      for (let budget = 0; budget <= 4; budget += 1) {
        assert.throws(() => allocateAttention({ budget, obstructions: [first, second] }),
          { name: "TypeError", message: "duplicate obstruction id x" });
        checked += 1;
      }
    }
  }
  assert.equal(checked, 405);
  assert.throws(() => allocateAttention({ budget: 0, obstructions: [
    { id: "", cost: 0, benefit: 0 }, { id: "", cost: 0, benefit: 0 },
  ] }), { name: "TypeError", message: "duplicate obstruction id " });
});

test("allocateAttention rejects duplicates above the exact-enumeration limit", () => {
  const obstructions = Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, cost: 1, benefit: i + 1 }));
  obstructions[20].id = obstructions[0].id;
  assert.throws(() => allocateAttention({ budget: 3, obstructions }),
    { name: "TypeError", message: "duplicate obstruction id c0" });
});

test("allocateAttention retains free work and original object identity at zero budget", () => {
  const obstructions = Object.freeze([
    Object.freeze({ id: "paid", cost: 1, benefit: 9 }),
    Object.freeze({ id: "free-a", cost: 0, benefit: 2 }),
    Object.freeze({ id: "free-b", cost: 0, benefit: 5 }),
    Object.freeze({ id: "zero", cost: 0, benefit: 0 }),
  ]);
  const result = allocateAttention({ budget: 0, obstructions });
  assert.deepEqual(result.readNext, ["free-b", "free-a"]);
  assert.equal(result.selected[0], obstructions[2]);
  assert.equal(result.selected[1], obstructions[1]);
  assert.equal(result.cost, 0);
  assert.equal(result.benefit, 7);
  assert.equal(result.residual, 9);
  assert.equal(result.exact, true);
  assert.equal(result.choiceBits, 0);
  assert.deepEqual(obstructions.map((o) => o.id), ["paid", "free-a", "free-b", "zero"]);
});

test("allocateAttention keeps unique raw string IDs without normalization or prototype collisions", () => {
  const ids = ["", "x", " x", "X", "__proto__", "constructor"];
  const result = allocateAttention({ budget: 0, obstructions: ids.map((id) => ({ id, cost: 0, benefit: 1 })) });
  assert.equal(result.selected.length, ids.length);
  assert.deepEqual(new Set(result.readNext), new Set(ids));
  assert.equal(result.cost, 0);
  assert.equal(result.benefit, ids.length);
});

test("allocateAttention retains the exact solver's paid tie choice", () => {
  const result = allocateAttention({ budget: 2, obstructions: [
    { id: "first", cost: 1, benefit: 5 },
    { id: "second", cost: 2, benefit: 5 },
    { id: "free", cost: 0, benefit: 1 },
  ] });
  assert.deepEqual(result.readNext, ["free", "second"]);
  assert.equal(result.cost, 2);
  assert.equal(result.benefit, 6);
  assert.equal(result.residual, 5);
  assert.equal(result.exact, true);
  assert.equal(result.choiceBits, 1);
});

test("allocateAttention keeps the unique-ID greedy fallback feasible and disclosed", () => {
  const obstructions = [
    { id: "free", cost: 0, benefit: 4 },
    ...Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, cost: 1, benefit: i + 1 })),
  ];
  const result = allocateAttention({ budget: 3, obstructions });
  assert.deepEqual(result.readNext, ["free", "c20", "c19", "c18"]);
  assert.equal(result.cost, 3);
  assert.equal(result.benefit, 64);
  assert.equal(result.exact, false);
  assert.equal(result.choiceBits, null);
});

test("allocateAttention keeps existing shape and non-negative integer validation", () => {
  for (const request of [
    undefined,
    { obstructions: [], budget: -1 },
    { obstructions: [], budget: 1.5 },
    { obstructions: [], budget: Infinity },
    { obstructions: [{ id: 1, cost: 0, benefit: 0 }], budget: 0 },
    { obstructions: [{ id: "a", cost: -1, benefit: 0 }], budget: 0 },
    { obstructions: [{ id: "a", cost: 0, benefit: 0.5 }], budget: 0 },
  ]) assert.throws(() => allocateAttention(request), TypeError);
});

test("allocateAttention is feasible and benefit-optimal on 4,100 small unique-ID requests", () => {
  let checked = 0;
  for (let length = 0; length <= 3; length += 1) {
    for (let encoding = 0; encoding < 9 ** length; encoding += 1) {
      let remaining = encoding;
      const obstructions = Array.from({ length }, (_, index) => {
        const value = remaining % 9;
        remaining = Math.floor(remaining / 9);
        return { id: `c${index}`, cost: Math.floor(value / 3), benefit: value % 3 };
      });
      const snapshot = structuredClone(obstructions);
      for (let budget = 0; budget <= 4; budget += 1) {
        let optimumBenefit = 0;
        for (let mask = 0; mask < 2 ** length; mask += 1) {
          let cost = 0;
          let benefit = 0;
          for (let index = 0; index < length; index += 1) {
            if (!(mask & (1 << index))) continue;
            cost += obstructions[index].cost;
            benefit += obstructions[index].benefit;
          }
          if (cost <= budget) optimumBenefit = Math.max(optimumBenefit, benefit);
        }
        const result = allocateAttention({ budget, obstructions });
        assert.ok(result.cost <= budget);
        assert.equal(result.benefit, optimumBenefit);
        assert.equal(result.cost, result.selected.reduce((sum, o) => sum + o.cost, 0));
        assert.equal(result.benefit, result.selected.reduce((sum, o) => sum + o.benefit, 0));
        assert.equal(result.residual, obstructions.reduce((sum, o) => sum + o.benefit, 0) - result.benefit);
        assert.deepEqual(result.readNext, result.selected.map((o) => o.id));
        assert.equal(new Set(result.readNext).size, result.readNext.length);
        assert.ok(result.selected.every((o) => obstructions.includes(o) && o.benefit > 0));
        assert.ok(obstructions.filter((o) => o.cost === 0 && o.benefit > 0).every((o) => result.selected.includes(o)));
        assert.equal(result.exact, true);
        assert.deepEqual(obstructions, snapshot);
        checked += 1;
      }
    }
  }
  assert.equal(checked, 4100);
});
