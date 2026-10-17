import assert from "node:assert/strict";
import test from "node:test";
import { maximizeFiniteSubsets } from "../../src/number/finite-subset.mjs";

test("tail-first exact optimizer retains first winning subset on a tie", () => {
  const equal = maximizeFiniteSubsets(2, mask => {
    const total = (mask & 1 ? 5 : 0) + (mask & 2 ? 5 : 0);
    const cost = (mask & 1 ? 1 : 0) + (mask & 2 ? 2 : 0);
    return cost <= 2 ? total : null;
  });
  assert.equal(equal.value, 5);
  assert.equal(equal.mask, 2, "the second equal-benefit candidate wins as in solveL");
  assert.equal(equal.tieCount, 2);
  assert.equal(equal.choiceBits, 1);
});

test("pure selector is independent of domain and preserves all ties", () => {
  const all = maximizeFiniteSubsets(5, () => 0);
  assert.equal(all.mask, 0);
  assert.equal(all.tieCount, 32);
  assert.equal(all.choiceBits, 5);
  const negatives = maximizeFiniteSubsets(2, mask => mask === 0 ? -1 : -2);
  assert.equal(negatives.mask, 0);
  assert.equal(negatives.value, -1);
});

test("shared kernel agrees with independent bit-reversal oracle on thousands of subsets", () => {
  function ordering(n) {
    const recur = k => k === 0 ? [0] : (() => {
      const tails = recur(k - 1).map(x => x << 1);
      return [...tails, ...tails.map(x => x | 1)];
    })();
    return recur(n);
  }
  let examined = 0;
  for (let n = 1; n <= 9; n++) {
    const costs = Array.from({length:n},(_,i)=>1+(i%4));
    const benefits = Array.from({length:n},(_,i)=>((i*7+5)%6));
    for (let budget=0;budget<=10;budget++) {
      const evaluate = mask => {
        let cost=0,benefit=0;
        for(let i=0;i<n;i++)if(mask&(1<<i)){cost+=costs[i];benefit+=benefits[i];}
        return cost<=budget?benefit:null;
      };
      const actual = maximizeFiniteSubsets(n,evaluate);
      let optimum=-Infinity, expectedMask=0, ties=0;
      for(const mask of ordering(n)){
        const value=evaluate(mask);
        if(value===null)continue;
        if(value>optimum){optimum=value;expectedMask=mask;ties=1;}
        else if(value===optimum)ties++;
      }
      assert.equal(actual.value,optimum);
      assert.equal(actual.mask,expectedMask);
      assert.equal(actual.tieCount,ties);
      examined++;
    }
  }
  assert.equal(examined,99);
});

test("invalid scores and impossible subset spaces refuse rather than fake a witness", () => {
  assert.throws(()=>maximizeFiniteSubsets(0,()=>0),/1\.\.20/u);
  assert.throws(()=>maximizeFiniteSubsets(21,()=>0),/1\.\.20/u);
  assert.throws(()=>maximizeFiniteSubsets(2,null),/feasibility\/value/u);
  assert.throws(()=>maximizeFiniteSubsets(2,()=>null),/no feasible subset/u);
  assert.throws(()=>maximizeFiniteSubsets(2,()=>undefined),/finite value or null/u);
  assert.throws(()=>maximizeFiniteSubsets(2,()=>NaN),/finite value or null/u);
  assert.throws(()=>maximizeFiniteSubsets(2,()=>Infinity),/finite value or null/u);
});
