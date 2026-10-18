import assert from "node:assert/strict";
import { test } from "node:test";

import { allocateAttention, allocateBudget, computeAllocation, validateAttentionAllocationRequest } from "../src/obstruction/attention-allocation.mjs";

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
  assert.equal(result.theoremReceipt, null, "a JS calculation is not a Lean-kernel receipt");
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


test("choice entropy retains real Hartley bits separately from Lean Nat.log2", () => {
  const three=computeAllocation({
    budget:1,candidates:[
      {id:"a",cost:1,benefit:5},{id:"b",cost:1,benefit:5},{id:"c",cost:1,benefit:5},
    ],
  });
  assert.equal(three.degeneracy,3,"three distinct optimum singleton subsets");
  assert.equal(three.choiceBitsNat,1,"Lean's Nat.log2(3) is one");
  assert.equal(three.choiceBits,Math.log2(3),"the real entropy retains fractional bits");
  assert.equal(three.theoremReceipt, null, "do not invent Lean provenance from a JS optimum");
  const infeasible=computeAllocation({budget:1,candidates:[{id:"expensive",cost:3,benefit:9}]});
  assert.equal(infeasible.degeneracy,1,"the empty sublist is the unique feasible optimum");
  assert.equal(infeasible.choiceBitsNat,0);
  assert.equal(infeasible.choiceBits,0);
});

test("caller-budgeted incomplete allocation does not invent tie counts", () => {
  const many=computeAllocation({budget:3,maxSearchNodes:1,candidates:Array.from({length:21},(_,i)=>({
    id:`candidate-${i}`,cost:1,benefit:1,
  }))});
  assert.equal(many.exact,false);
  assert.equal(many.degeneracy,null);
  assert.equal(many.choiceBitsNat,null);
  assert.equal(many.choiceBits,null);
  assert.equal(many.theoremReceipt,null);
});

test("larger-than-exhaustive all-fit work is exact without borrowing a bounded Lean receipt", () => {
  const candidates = Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, cost: i + 1, benefit: (i + 1) * 2 }));
  const result = computeAllocation({ budget: 1000, candidates });
  assert.equal(result.exact, true);
  assert.deepEqual(result.funded, candidates.map((c) => c.id));
  assert.equal(result.totalCost, 231);
  assert.equal(result.totalBenefit, 462);
  assert.equal(result.degeneracy, 1);
  assert.equal(result.choiceBits, 0);
  assert.equal(result.choiceBitsNat, 0);
  assert.equal(result.theoremReceipt, null, "no bounded solveL enumeration took place");
  const publicReadout = allocateAttention({ budget: 1000, obstructions: candidates });
  assert.equal(publicReadout.exact, true);
  assert.equal(publicReadout.residual, 0);
});

test("larger-than-exhaustive wholly unaffordable work has an exact empty optimum", () => {
  const candidates = Array.from({ length: 25 }, (_, i) => ({ id: `lot-${i}`, cost: 2 + i, benefit: 3 + i }));
  const result = computeAllocation({ budget: 1, candidates });
  assert.equal(result.exact, true);
  assert.deepEqual(result.funded, []);
  assert.equal(result.totalBenefit, 0);
  assert.equal(result.totalCost, 0);
  assert.equal(result.choiceBits, 0);
  assert.equal(result.degeneracy, 1);
  assert.equal(result.theoremReceipt, null);
  const publicReadout = allocateAttention({ budget: 1, obstructions: candidates });
  assert.equal(publicReadout.exact, true);
  assert.equal(publicReadout.readNext.length, 0);
  assert.equal(publicReadout.residual, candidates.reduce((sum, c) => sum + c.benefit, 0));
});


test("the >20-candidate allocator takes the best affordable singleton when density greedy wastes capacity", () => {
  const candidates = [
    { id: "density-lure", cost: 1, benefit: 11 },
    { id: "full-budget", cost: 10, benefit: 100 },
    ...Array.from({ length: 19 }, (_, i) => ({ id: `weak-${i}`, cost: 10, benefit: 1 })),
  ];
  // Plain density greedy would take the lure and strand nine budget units,
  // returning only 11 instead of the feasible singleton's 100.
  const allocation = computeAllocation({ budget: 10, candidates });
  assert.deepEqual(allocation.funded, ["full-budget"]);
  assert.equal(allocation.totalCost, 10);
  assert.equal(allocation.totalBenefit, 100);
  assert.equal(allocation.exact, true);
  assert.equal(allocation.theoremReceipt, null);
  const readout = allocateAttention({ budget: 10, obstructions: candidates });
  assert.deepEqual(readout.readNext, ["full-budget"]);
  assert.equal(readout.cost, 10);
  assert.equal(readout.benefit, 100);
  assert.equal(readout.residual, 30);
  assert.equal(readout.exact, true);
});

test("the >20-candidate allocator keeps the better multi-item packing and excludes unaffordable lots", () => {
  const candidates = [
    { id: "outside-budget", cost: 100, benefit: 10000 },
    ...Array.from({ length: 20 }, (_, i) => ({ id: `affordable-${i}`, cost: 1, benefit: 3 })),
  ];
  const allocation = computeAllocation({ budget: 5, candidates });
  assert.deepEqual(allocation.funded, [
    "affordable-15", "affordable-16", "affordable-17", "affordable-18", "affordable-19",
  ]);
  assert.equal(allocation.totalBenefit, 15);
  assert.equal(allocation.totalCost, 5);
  assert.equal(allocation.exact, true);
  assert.equal(allocation.theoremReceipt, null);
});

test("inadmissible requests are refused", () => {
  assert.throws(() => computeAllocation({ budget: 0, candidates: [{ id: "a", cost: 1, benefit: 1 }] }), /positive finite number/);
  assert.throws(() => computeAllocation({ budget: 5, candidates: [] }), /non-empty list/);
  assert.throws(() => computeAllocation({ budget: 5, candidates: [{ id: "a", cost: -1, benefit: 1 }] }), /positive finite cost/);
  assert.throws(() => computeAllocation({ budget: 5, candidates: [{ id: "a", cost: 1, benefit: 1 }, { id: "a", cost: 2, benefit: 2 }] }), /duplicate candidate id/);
});


test("natural-number attention requests do not impose a total-cost ceiling", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const plan = computeAllocation({ budget: max, candidates: [
    { id: "a", cost: max, benefit: 1 }, { id: "b", cost: 1, benefit: 1 },
  ] });
  assert.equal(plan.exact, true);
  assert.deepEqual(plan.funded, ["b"]);
  assert.equal(plan.totalCost, 1);
  assert.throws(() => computeAllocation({ budget: max, candidates: [
    { id: "a", cost: 1, benefit: max }, { id: "b", cost: 1, benefit: 1 },
  ] }), /aggregate benefits/);
  assert.equal(computeAllocation({ budget: 2, candidates: [
    { id: "one", cost: 1, benefit: 1 }, { id: "two", cost: 1, benefit: 1 },
  ] }).theoremReceipt, null);
});

test("the obstruction readout refuses unsafe costs or a rounded residual", () => {
  const max = Number.MAX_SAFE_INTEGER;
  assert.throws(() => allocateAttention({ budget: max + 1, obstructions: [] }), TypeError);
  assert.throws(() => allocateAttention({ budget: max, obstructions: [
    { id: "unsafe-cost", cost: max + 1, benefit: 1 },
  ] }), TypeError);
  assert.throws(() => allocateAttention({ budget: 0, obstructions: [
    { id: "unsafe-benefit", cost: 0, benefit: max + 1 },
  ] }), TypeError);
  assert.throws(() => allocateAttention({ budget: max, obstructions: [
    { id: "a", cost: 0, benefit: max }, { id: "b", cost: 0, benefit: 1 },
  ] }), /attention benefit aggregate exceeds safe integer/);
  const safe = allocateAttention({ budget: 0, obstructions: [{ id: "free", cost: 0, benefit: max }] });
  assert.equal(safe.benefit, max);
  assert.equal(safe.residual, 0);
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
  assert.equal(result.exact, false);
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

test("ATT readout preserves fractional entropy and qualified formal Nat bits", () => {
  const selected = allocateAttention({budget:1,obstructions:[
    {id:"a",cost:1,benefit:5},{id:"b",cost:1,benefit:5},
    {id:"c",cost:1,benefit:5},{id:"free",cost:0,benefit:2},
  ]});
  assert.equal(selected.exact,true);
  assert.equal(selected.degeneracy,3);
  assert.equal(selected.choiceBits,Math.log2(3));
  assert.equal(selected.choiceBitsNat,1);
  const unenumerated=allocateAttention({budget:1,obstructions:[
    {id:"a",cost:1,benefit:5},{id:"zero-benefit",cost:0,benefit:0},
  ]});
  assert.equal(unenumerated.choiceBitsNat,null,
    "a zero-benefit lot can enlarge the original optimal tie-set");
  assert.equal(unenumerated.degeneracy,null);
  assert.equal(unenumerated.choiceBits,0,
    "legacy real-valued solver field is preserved, scoped to selected positive-benefit lots");
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
  assert.equal(result.exact, true);
  assert.equal(result.choiceBits, 0);
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


test("streaming exact allocation agrees with exhaustive tail-first subset ordering and all ties", () => {
  function expected(candidates, budget) {
    const masks = n => n === 0 ? [0] : (() => { const tails = masks(n-1).map(x=>x<<1); return [...tails,...tails.map(x=>x|1)]; })();
    let optimum = -Infinity, picked = 0, ties = 0;
    for (const mask of masks(candidates.length)) {
      const selected = candidates.filter((_,i)=>(mask&(1<<i))!==0);
      if (selected.reduce((sum,x)=>sum+x.cost,0)>budget) continue;
      const benefit=selected.reduce((sum,x)=>sum+x.benefit,0);
      if (benefit>optimum) {optimum=benefit;picked=mask;ties=1;}
      else if(benefit===optimum)ties++;
    }
    return {funded:candidates.filter((_,i)=>(picked&(1<<i))!==0).map(x=>x.id),
      choiceBits:Math.log2(ties),benefit:optimum};
  }
  for (let n=1;n<=9;n++) {
    const candidates=Array.from({length:n},(_,i)=>({
      id:"lot-"+i,
      cost:1+(i%4),
      benefit:1+((i*13+5)%6),
    }));
    for(let budget=1;budget<=12;budget++) {
      const actual=computeAllocation({candidates,budget});
      const witness=expected(candidates,budget);
      assert.deepEqual(actual.funded,witness.funded,"source order at n="+n+" budget="+budget);
      assert.equal(actual.choiceBits,witness.choiceBits,"choice count at n="+n+" budget="+budget);
      assert.equal(actual.totalBenefit,witness.benefit,"benefit at n="+n+" budget="+budget);
    }
  }
});

test("the all-fit and none-fit portfolios avoid exponential observation work", () => {
  for (const scenario of ["all-fit", "none-fit"]) {
    let costReads = 0;
    const candidates = Array.from({ length: 20 }, (_, index) => ({
      id: `${scenario}-lot-${index}`,
      get cost() { costReads += 1; return scenario === "all-fit" ? 1 : 2; },
      benefit: 1,
    }));
    const allocation = computeAllocation({
      budget: scenario === "all-fit" ? 20 : 1,
      candidates,
    });
    assert.equal(allocation.exact, true);
    assert.equal(allocation.fundedCount, scenario === "all-fit" ? 20 : 0);
    assert.equal(allocation.totalBenefit, scenario === "all-fit" ? 20 : 0);
    assert.equal(allocation.choiceBits, 0);
    assert.equal(allocation.degeneracy, 1);
    assert.equal(allocation.theoremReceipt, null);
    assert.ok(costReads < 1000,
      `pure trivial selection should not touch all 2^20 subsets: ${scenario}, ${costReads} reads`);
  }
});

test("20-item exact capacity selection does not require million-element subset or feasible-mask buffers", () => {
  const candidates=Array.from({length:20},(_,i)=>({id:"compute-lot-"+i,cost:1,benefit:1}));
  const atFull=computeAllocation({candidates,budget:20});
  assert.equal(atFull.totalBenefit,20);
  assert.equal(atFull.fundedCount,20);
  assert.equal(atFull.choiceBits,0);
  const half=computeAllocation({candidates,budget:10});
  assert.equal(half.exact,true);
  assert.equal(half.totalBenefit,10);
  assert.equal(half.fundedCount,10);
  assert.equal(half.choiceBits,Math.log2(184756),"every feasible 10-lot optimum must remain acknowledged");
  assert.equal(half.theoremReceipt, null);
});


test("prepayment admission reuses the mathematical allocator's real numeric and identity law", () => {
  const valid = {
    budget: 10, obstructions: [
      { id: "claim|source", cost: 4, benefit: 9 },
      { id: "claim", cost: 6, benefit: 10 },
    ],
    maxSearchNodes: 32,
  };
  assert.equal(validateAttentionAllocationRequest(valid), valid,
    "do not fabricate a second carrier, copy evidence, or run a search");
  assert.equal(allocateAttention(valid).cost, 10);
  assert.equal(validateAttentionAllocationRequest({ budget: 0, obstructions: [] }).budget, 0);
  assert.throws(() => validateAttentionAllocationRequest(null), /request object/);
  assert.throws(() => validateAttentionAllocationRequest({ budget: 1, obstructions: [
    { id: "duplicate", cost: 1, benefit: 1 },
    { id: "duplicate", cost: 1, benefit: 1 },
  ] }), /duplicate obstruction id duplicate/);
});

test("prepayment admission refuses unrepresentable, over-allocated, and forged budgets", () => {
  const request = (value) => ({ budget: 7, obstructions: [{ id: "one", cost: 1, benefit: value }] });
  for (const value of [NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateAttentionAllocationRequest(request(value)),
      /non-negative integer cost and benefit/);
  }
  assert.throws(() => validateAttentionAllocationRequest({
    budget: Number.MAX_SAFE_INTEGER + 1, obstructions: [],
  }), /non-negative integer budget/);
  assert.throws(() => validateAttentionAllocationRequest({
    budget: 2, obstructions: [
      { id: "first", cost: 1, benefit: Number.MAX_SAFE_INTEGER },
      { id: "second", cost: 1, benefit: 1 },
    ],
  }), /attention benefit aggregate exceeds safe integer/);
  for (const maxSearchNodes of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateAttentionAllocationRequest({
      budget: 1, obstructions: [], maxSearchNodes,
    }), /maxSearchNodes must be a positive/);
  }
});
