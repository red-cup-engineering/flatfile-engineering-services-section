import test from "node:test";
import assert from "node:assert/strict";
import { allocateResourceCapacity } from "../src/resource-capacity-allocation.mjs";

const resourceNi = c => "ni:///sha-256;" + c.repeat(43);
const cpu = resourceNi("A"), ram = resourceNi("B");
const resource = (dimensionNi, quantity) => ({ dimensionNi, quantity: String(quantity) });
const lot = (id, benefit, cpuUse, ramUse) => ({
  id:resourceNi(id), benefit, resources:[resource(cpu,cpuUse),resource(ram,ramUse)],
});

test("capacity allocator chooses exact benefit-optimal lots under CPU and RAM independently", () => {
  const input = {
    capacities:[resource(cpu,7),resource(ram,5)],
    candidates:[lot("C",9,5,2),lot("D",7,4,3),lot("E",6,3,2)],
  };
  const r=allocateResourceCapacity(input);
  assert.equal(r.type,"MetrologicTypedResourceCapacityAllocation");
  assert.deepEqual(r.funded,[resourceNi("D"),resourceNi("E")]);
  assert.equal(r.totalBenefit,13);
  assert.deepEqual(r.budget.map(x=>[x.available,x.used,x.remaining]),
    [["7","7","0"],["5","5","0"]]);
  assert.equal(r.exact,true);
  assert.equal(r.theoremReceipt,null,"scalar Lean proof not claimed for vector knapsack");
  assert.equal(r.monetaryClaim,null);
  assert.equal(r.reserveCommitted,false);
  assert.equal(r.jobsExecuted,false);
});

test("nonfungible capacity dimensions cannot be silently merged by quantity or label", () => {
  const input={capacities:[resource(cpu,9),resource(ram,9)],
    candidates:[lot("C",10,5,1)]};
  const baseline=allocateResourceCapacity(input);
  assert.equal(baseline.funded.length,1);
  const differentRights=resourceNi("F");
  assert.throws(()=>allocateResourceCapacity({...input,
    candidates:[{...input.candidates[0],resources:[resource(differentRights,5),resource(ram,1)]}]}),
    /known, unique, exactly typed resource dimensions/u);
  const exhausted=allocateResourceCapacity({...input,capacities:[resource(cpu,4),resource(ram,9)]});
  assert.deepEqual(exhausted.funded,[]);
  assert.equal(exhausted.totalBenefit,0);
  assert.deepEqual(exhausted.budget.map(x=>x.used),["0","0"]);
  assert.deepEqual(allocateResourceCapacity({...input,capacities:[resource(ram,9),resource(cpu,9)]}).funded,
    baseline.funded,"relabeling input dimension order does not change lawfulness");
});

test("separate benefit ties preserve inherited tail-first order and disclose choiceBits", () => {
  const result=allocateResourceCapacity({
    capacities:[resource(cpu,1),resource(ram,1)],
    candidates:[lot("C",5,1,1),lot("D",5,1,1)],
  });
  assert.deepEqual(result.funded,[resourceNi("D")]);
  assert.equal(result.choiceBits,1);
});

test("typed two-resource solver agrees with independent exhaustive optimum for many finite lots", () => {
  for(let n=1;n<=8;n++) {
    const candidates=Array.from({length:n},(_,i)=>lot(String.fromCharCode(67+i),
      1+((i*7+3)%9),1+(i%3),1+((i*2+1)%4)));
    const limits=[resource(cpu,7),resource(ram,9)];
    const result=allocateResourceCapacity({capacities:limits,candidates});
    let best=0,count=0;
    for(let mask=0;mask<2**n;mask++){
      let score=0,a=0,b=0;
      for(let i=0;i<n;i++)if(mask&(1<<i)){
        score+=candidates[i].benefit;
        a+=Number(candidates[i].resources[0].quantity);
        b+=Number(candidates[i].resources[1].quantity);
      }
      if(a>7||b>9)continue;
      if(score>best){best=score;count=1}
      else if(score===best)count++;
    }
    assert.equal(result.totalBenefit,best);
    assert.equal(result.choiceBits,Math.log2(count));
    assert.ok(result.budget.every(x=>BigInt(x.used)<=BigInt(x.available)));
  }
});

test("bounded vector work rejects missing evidence identities, unsafe benefits and excessive loads", () => {
  const candidate=lot("C",1,1,1), capacities=[resource(cpu,10),resource(ram,10)];
  const badInputs=[
    {capacities:[],candidates:[candidate]},
    {capacities:[resource(cpu,9),resource(cpu,9)],candidates:[candidate]},
    {capacities,candidates:[candidate,candidate]},
    {capacities,candidates:[{...candidate,benefit:0}]},
    {capacities,candidates:[{...candidate,benefit:Number.MAX_SAFE_INTEGER+1}]},
    {capacities,candidates:[{...candidate,resources:[resource(cpu,"001"),resource(ram,2)]}]},
    {capacities,candidates:[{...candidate,resources:[resource(cpu,2),resource(cpu,2)]}]},
    {capacities,candidates:[{...candidate,id:"not-content-addressed"}]},
    {capacities:[resource(cpu,2),resource(ram,3)],candidates:Array.from({length:17},(_,i)=>lot(String.fromCharCode(67+i),1,1,1))},
  ];
  for(const input of badInputs){
    assert.throws(()=>allocateResourceCapacity(input),Error);
  }
});
