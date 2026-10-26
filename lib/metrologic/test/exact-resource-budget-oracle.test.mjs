import assert from 'node:assert/strict';
import test from 'node:test';
import { computeExactResourceMathWork, verifyExactResourceMathWork } from '../src/obstruction/exact-resource-work.mjs';
import { verifyResourceFlowCertificate } from '../src/obstruction/resource-flow-verifier.mjs';

// Independent oracle: enumerate every integer feasible link assignment. Network
// incidence total unimodularity implies an integral optimum at integer demand;
// linear interpolation of those integer optima gives the continuous cost curve.
// This does not import the optimizer's arithmetic or path-generation machinery.
function gcd(a,b) { while(b) [a,b]=[b,a%b]; return a<0n?-a:a; }
function rat(n,d=1n) { n=BigInt(n); d=BigInt(d); const g=gcd(n,d); return [n/g,d/g]; }
function read(s) { const [n,d='1']=String(s).split('/'); return rat(n,d); }
function show([n,d]) { return d===1n?String(n):`${n}/${d}`; }
const add=([a,b],[c,d])=>rat(a*d+c*b,b*d);
const sub=([a,b],[c,d])=>rat(a*d-c*b,b*d);
const div=([a,b],[c,d])=>rat(a*d,b*c);
const cmp=([a,b],[c,d])=>a*d<c*b?-1:a*d>c*b?1:0;

function enumerate(network) {
  const balance=Array(network.nodes.length).fill(0);
  const minimum=Array(4).fill(Infinity);
  const index=new Map(network.nodes.map((x,i)=>[x,i]));
  let assignments=0,feasible=0;
  function visit(i,cost) {
    if(i===network.links.length) {
      assignments++;
      const f=balance[3];
      if(f<0||f>3||balance[0]!==-f||balance[1]!==0||balance[2]!==0)return;
      feasible++; minimum[f]=Math.min(minimum[f],cost); return;
    }
    const arc=network.links[i],u=index.get(arc.from),v=index.get(arc.to);
    for(let volume=0;volume<=arc.capacity;volume++) {
      balance[u]-=volume; balance[v]+=volume;
      visit(i+1,cost+volume*arc.unitResourceCost);
      balance[u]+=volume; balance[v]-=volume;
    }
  }
  visit(0,0);
  const last=minimum.findLastIndex(Number.isFinite);
  assert(minimum.slice(0,last+1).every(Number.isFinite),'integer feasible delivery interval');
  for(let i=2;i<=last;i++)assert(minimum[i]-minimum[i-1]>=minimum[i-1]-minimum[i-2],'convex minimum cost');
  return {minimum:minimum.slice(0,last+1),assignments,feasible};
}
function quote(minimum,budget) {
  budget=read(budget);
  let delivered=rat(0),cost=rat(0),marginal=null;
  for(let f=1;f<minimum.length;f++) {
    const end=rat(minimum[f]),start=rat(minimum[f-1]);
    if(cmp(budget,end)>=0) { delivered=rat(f); cost=end; continue; }
    const slope=rat(minimum[f]-minimum[f-1]);
    if(cmp(budget,start)>=0) { delivered=add(rat(f-1),div(sub(budget,start),slope)); cost=budget; }
    marginal=show(slope); break;
  }
  return {delivered:show(delivered),cost:show(cost),marginal};
}

test('budget certificates agree with an independent exhaustive primal oracle and adversarial receiving cases', () => {
  let state=0x561c311;
  const random=n=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state%n;};
  const nodes=['s','a','b','t'];
  const possible=nodes.flatMap(from=>nodes.filter(to=>from!==to).map(to=>({from,to})));
  const budgets=['11/2',0,'3/2',2,25,'1/2',3,'2/4','7/2',7,1,'9/2',0];
  let assignments=0,feasibleAssignments=0,certificates=0,replays=0;
  for(let example=0;example<240;example++) {
    const edges=[...possible];
    for(let i=edges.length-1;i>0;i--){const j=random(i+1);[edges[i],edges[j]]=[edges[j],edges[i]];}
    const network={nodes,links:edges.slice(0,7).map((arc,i)=>({...arc,id:`e${i}`,capacity:random(3),unitResourceCost:random(5)})),sources:[{node:'s',capacity:3}],demands:[{node:'t',amount:3}]};
    const oracle=enumerate(network);
    assignments+=oracle.assignments;feasibleAssignments+=oracle.feasible;
    const input={network,budgets};
    const work=computeExactResourceMathWork(input);
    assert.equal(work.optimizationPasses,1);
    assert.equal(work.budgetCertificates.length,budgets.length);
    for(let i=0;i<budgets.length;i++) {
      const expected=quote(oracle.minimum,budgets[i]);
      const observed=work.budgetQuotes[i],proof=work.budgetCertificates[i];
      assert.deepEqual({delivered:observed.maximumDelivery,cost:observed.minimumResourceForMaximumDelivery,marginal:observed.nextMarginalResourcePerDeliveredUnit},expected,`enumerated objective at network ${example} budget ${budgets[i]}`);
      assert.equal(proof.index,i);assert.equal(proof.budget,show(read(budgets[i])));
      assert.equal(proof.witness.delivered,expected.delivered);assert.equal(proof.witness.resourceCost,expected.cost);
      assert.equal(proof.verification.verified,true);certificates++;
    }
    const replay=verifyExactResourceMathWork(input,JSON.parse(JSON.stringify(work)));
    assert.equal(replay.verified,true,JSON.stringify(replay));assert.equal(replay.optimizerExecuted,false);assert.equal(replay.intermediatePrimalCertificates,true);replays++;
  }

  // Rerouting example: assignment ax must be partially reversed to serve y.
  const rerouting={nodes:['s','a','b','x','y','t'],links:[
    ['sa','s','a',1,0],['sb','s','b',1,0],['ax','a','x',1,0],['ay','a','y',1,1],['bx','b','x',1,1],['xt','x','t',1,0],['yt','y','t',1,0]
  ].map(([id,from,to,capacity,unitResourceCost])=>({id,from,to,capacity,unitResourceCost})),sources:[{node:'s',capacity:2}],demands:[{node:'t',amount:2}]};
  const reroute=computeExactResourceMathWork({network:rerouting,budgets:['1/2','3/2',0,2]});
  assert.deepEqual(reroute.budgetQuotes.map(x=>x.maximumDelivery),['5/4','7/4','1','2']);
  assert.deepEqual(reroute.budgetCertificates.slice(0,2).map(c=>c.witness.flows.find(f=>f.id==='ax').volume),['3/4','1/4']);
  assert.equal(verifyExactResourceMathWork({network:rerouting,budgets:['1/2','3/2',0,2]},reroute).verified,true);

  // Source and demand on the same node: every nonnegative budget includes free
  // local delivery; supply/demand overlap is not an absent-edge failure.
  const colocated={nodes:['a'],links:[],sources:[{node:'a',capacity:3}],demands:[{node:'a',amount:2}]};
  const colocatedWork=computeExactResourceMathWork({network:colocated,budgets:[0,'1/2',9]});
  assert(colocatedWork.budgetCertificates.every(x=>x.witness.delivered==='2'&&x.witness.resourceCost==='0'));
  assert.equal(verifyExactResourceMathWork({network:colocated,budgets:[0,'1/2',9]},colocatedWork).verified,true);

  // An optimal but undersupplied lower-budget witness is NOT a proof for a
  // larger budget, even if all flow conservation and dual inequalities hold.
  const undersupplied=reroute.budgetCertificates[0].witness;
  const rejection=verifyResourceFlowCertificate({...rerouting,budget:2},{totalDemand:'2',budget:'2',allDemandFeasible:false,withBudget:undersupplied});
  assert.equal(rejection.verified,false);
  assert.match(rejection.reason,/affordable positive augmentation/);
});
