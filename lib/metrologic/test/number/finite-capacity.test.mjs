import assert from "node:assert/strict";
import { test } from "node:test";
import { solveFiniteVectorCapacity } from "../../src/number/finite-capacity.mjs";

test("finite resource vector optimizer is identity-free, unit-free and exact", () => {
  const source = {
    capacities: [7n, 5n],
    requests: [[5n, 2n], [4n, 3n], [3n, 2n]],
    benefits: [9, 7, 6],
  };
  const result = solveFiniteVectorCapacity(source);
  assert.deepEqual(result.selectedIndexes, [1, 2]);
  assert.deepEqual(result.used, [7n, 5n]);
  assert.deepEqual(result.remaining, [0n, 0n]);
  assert.equal(result.totalBenefit, 13);
  assert.equal(result.exact, true);
  assert.equal(result.tieCount, 1);
  assert.equal(result.choiceBits, 0);
  assert.equal("dimensionNi" in result, false, "generic mathematics has no URI convention");
  assert.equal("monetaryClaim" in result, false, "pure capacity math has no payment/execution claims");
  const permuted = solveFiniteVectorCapacity({
    ...source,
    capacities: [5n, 7n],
    requests: source.requests.map(([cpu, ram]) => [ram, cpu]),
  });
  assert.deepEqual(permuted.selectedIndexes, result.selectedIndexes);
});

test("finite vector knapsack preserves chirality, exact ties and large natural capacities", () => {
  const huge = 1n << 280n;
  const big = solveFiniteVectorCapacity({
    capacities: [huge],
    requests: [[huge], [1n]],
    benefits: [5, 2],
  });
  assert.deepEqual(big.selectedIndexes, [0]);
  assert.deepEqual(big.remaining, [0n]);
  const tie = solveFiniteVectorCapacity({
    capacities: [1n],
    requests: [[1n], [1n]],
    benefits: [7, 7],
  });
  assert.deepEqual(tie.selectedIndexes, [1]);
  assert.equal(tie.tieCount, 2);
  assert.equal(tie.choiceBits, 1);
});

test("generic finite allocation rejects non-natural, unsafe and unaligned data", () => {
  const valid = {capacities:[1n, 2n],requests:[[1n, 1n]],benefits:[2]};
  for (const request of [
    { ...valid, capacities:[] },
    { ...valid, requests:[] },
    { ...valid, requests:[[1n]] },
    { ...valid, requests:[[1n, -1n]] },
    { ...valid, capacities:[1, 2] },
    { ...valid, benefits:[-1] },
    { ...valid, benefits:[Number.MAX_SAFE_INTEGER+1] },
    { ...valid, requests:[[1n, 1n]], benefits:[1, 1] },
  ]) assert.throws(() => solveFiniteVectorCapacity(request));
  assert.throws(() => solveFiniteVectorCapacity({
    capacities:[3n],requests:[[1n],[1n]],benefits:[Number.MAX_SAFE_INTEGER,1],
  }), /safe natural benefits/u);
});

test("finite vector solver agrees with independent exhaustive optimum for many workloads", () => {
  for(let n=1;n<=8;n++) {
    const source={
      capacities:[7n,9n,5n],
      requests:Array.from({length:n},(_,i)=>[BigInt(1+i%3),BigInt(1+(i*2+1)%4),BigInt(i%2)]),
      benefits:Array.from({length:n},(_,i)=>1+((i*7+3)%9)),
    };
    const actual=solveFiniteVectorCapacity(source);
    let maximum=-1,ties=0;
    for(let mask=0;mask<2**n;mask++){
      const uses=[0n,0n,0n];let value=0;
      for(let i=0;i<n;i++)if(mask&(1<<i)){
        value+=source.benefits[i];
        for(let d=0;d<uses.length;d++)uses[d]+=source.requests[i][d];
      }
      if(uses.some((use,d)=>use>source.capacities[d]))continue;
      if(value>maximum){maximum=value;ties=1;}
      else if(value===maximum)ties++;
    }
    assert.equal(actual.totalBenefit,maximum);
    assert.equal(actual.tieCount,ties);
    assert.equal(actual.choiceBits,Math.log2(ties));
    assert.ok(actual.used.every((quantity,d)=>quantity<=source.capacities[d]));
  }
});

test("larger all-fitting resource portfolios are exactly solved without exponential enumeration", () => {
  const n=256;
  const result=solveFiniteVectorCapacity({
    capacities:[256n,512n],
    requests:Array.from({length:n},()=>[1n,2n]),
    benefits:Array(n).fill(1),
  });
  assert.equal(result.exact,true);
  assert.equal(result.totalBenefit,n);
  assert.equal(result.selectedIndexes.length,n);
  assert.equal(result.searchTruncated,false);
  assert.equal(result.visitedNodes,0);
  assert.equal(result.tieCount,1);
});

test("many competing offers produce bounded feasible output without invented optimality", () => {
  const count=80;
  const result=solveFiniteVectorCapacity({
    capacities:[1n],
    requests:Array.from({length:count},()=>[1n]),
    benefits:Array(count).fill(1),
  });
  assert.equal(result.totalBenefit,1);
  assert.equal(result.selectedIndexes.length,1);
  assert.equal(result.used[0],1n);
  assert.equal(result.searchTruncated,false,"simple conflict can finish exact search");
  assert.equal(result.exact,true);
  assert.equal(result.tieCount,null);
  assert.equal(result.choiceBits,null);
  assert.ok(result.visitedNodes<=100000);
});

test("larger deterministic winner remains feasible under nonfungible independent capacities", () => {
  const result=solveFiniteVectorCapacity({
    capacities:[3n,2n,5n],
    requests:[
      [2n,2n,0n],[1n,0n,4n],[3n,2n,0n],
      ...Array.from({length:35},()=>[4n,0n,0n]),
    ],
    benefits:[5,6,9,...Array(35).fill(1)],
  });
  assert.equal(result.totalBenefit,11);
  assert.deepEqual(result.selectedIndexes,[0,1]);
  assert.deepEqual(result.used,[3n,2n,4n]);
  assert.ok(result.visitedNodes<=100000);
});

test("adversarial competing portfolios hit a finite search budget without fake exactness", () => {
  const request={
    capacities:[30n,30n],
    requests:Array.from({length:80},(_,i)=>[
      BigInt(1+(i*13)%10),BigInt(1+(i*7)%10),
    ]),
    benefits:Array.from({length:80},(_,i)=>1+(i*17)%13),
  };
  const result=solveFiniteVectorCapacity(request);
  assert.equal(result.searchTruncated,true);
  assert.equal(result.exact,false);
  assert.equal(result.visitedNodes,100000);
  assert.equal(result.tieCount,null);
  assert.equal(result.choiceBits,null);
  assert.ok(result.selectedIndexes.length>0);
  assert.ok(result.used.every((quantity,i)=>quantity<=request.capacities[i]));
  assert.equal(result.totalBenefit,
    result.selectedIndexes.reduce((sum,i)=>sum+request.benefits[i],0));
});

test("large vector admission scales but refuses inconsistent or unsafe inputs", () => {
  const full={
    capacities:[512n],
    requests:Array.from({length:512},()=>[1n]),
    benefits:Array(512).fill(1),
  };
  assert.equal(solveFiniteVectorCapacity(full).selectedIndexes.length,512);
  assert.throws(()=>solveFiniteVectorCapacity({...full,requests:[...full.requests,[1n]],benefits:[...full.benefits,1]}),/1\.\.512/u);
  assert.throws(()=>solveFiniteVectorCapacity({...full,capacities:Array(25).fill(1n)}),/1\.\.24/u);
  assert.throws(()=>solveFiniteVectorCapacity({...full,benefits:full.benefits.map(()=>Number.MAX_SAFE_INTEGER)}),/aggregate/u);
});
