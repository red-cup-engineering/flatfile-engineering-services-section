import assert from 'node:assert/strict';
import test from 'node:test';
import {solveConservedCapacityFlow, allocateFairSharedSources, capacityUpgradeResponse} from '../src/obstruction/capacity-flow.mjs';

const graph=()=>({
 unit:'authorized-inference-job',
 nodes:['source','flexible','exclusive','red-cup-gpu','cloud-free-cpu','sink'],
 source:'source',sink:'sink',
 links:[
  {id:'need-exclusive',from:'source',to:'exclusive',capacity:'1'},
  {id:'need-flexible',from:'source',to:'flexible',capacity:'1'},
  {id:'exclusive-gpu',from:'exclusive',to:'red-cup-gpu',capacity:'1'},
  {id:'flexible-gpu',from:'flexible',to:'red-cup-gpu',capacity:'1'},
  {id:'flexible-cloud',from:'flexible',to:'cloud-free-cpu',capacity:'1'},
  {id:'gpu-slots',from:'red-cup-gpu',to:'sink',capacity:'1'},
  {id:'cloud-slots',from:'cloud-free-cpu',to:'sink',capacity:'1'}
 ]
});

test('the capacity constrained optimizer reroutes flexible work and doubles genuinely achievable throughput',()=>{
 const r=solveConservedCapacityFlow(graph());
 assert.equal(r.maxRoutable,'2');
 assert.equal(r.sourceCapacity,'2');
 assert.equal(r.sinkCapacity,'2');
 assert.equal(r.unservedSourcePotential,'0');
 assert.equal(r.unusedSinkPotential,'0');
 assert.equal(r.conservation.allInteriorVerticesConserved,true);
 assert.equal(r.conservation.maximumEqualsMinimumCut,true);
 assert.equal(r.minCut.capacity,'2');
 assert.equal(r.links.find(x=>x.id==='exclusive-gpu').moved,'1');
 assert.equal(r.links.find(x=>x.id==='flexible-cloud').moved,'1');
 assert.equal(r.links.find(x=>x.id==='gpu-slots').moved,'1');
 assert.equal(r.links.find(x=>x.id==='cloud-slots').moved,'1');
 assert.equal(r.receiving,'pure-exact-source-graph-proof-not-runtime-reservation');
});

test('shared account quota is one true capacity, never two offers worth of fictitious slots',()=>{
 const packet=graph();
 packet.links=packet.links.filter(x=>x.id!=='cloud-slots');
 const observed=solveConservedCapacityFlow(packet);
 assert.equal(observed.maxRoutable,'1');
 assert.equal(observed.unservedSourcePotential,'1');
 assert.equal(observed.unusedSinkPotential,'0');
 assert.equal(observed.minCut.capacity,'1');
 assert.equal(observed.conservation.allInteriorVerticesConserved,true);
});

test('without an authorized actor/ability edge, arbitrarily large idle compute is not executable capacity',()=>{
 const packet=graph();
 packet.links=packet.links.filter(x=>x.id!=='flexible-cloud');
 const observed=solveConservedCapacityFlow(packet);
 assert.equal(observed.maxRoutable,'1');
 assert.equal(observed.unservedSourcePotential,'1');
 assert.equal(observed.unusedSinkPotential,'1');
 assert.equal(observed.minCut.capacity,'1');
});

test('quantity above IEEE exact range remains an exactly conserved natural',()=>{
 const huge='9007199254740993',packet={
  unit:'inference-token',nodes:['source','demand','provider','sink'],
  source:'source',sink:'sink',links:[
   {id:'demand',from:'source',to:'demand',capacity:huge},
   {id:'offer',from:'demand',to:'provider',capacity:huge},
   {id:'supply',from:'provider',to:'sink',capacity:huge}
  ]
 };
 const r=solveConservedCapacityFlow(packet);
 assert.equal(r.maxRoutable,huge);
 assert.equal(r.minCut.capacity,huge);
 assert.equal(r.unservedSourcePotential,'0');
});

test('vertex permutation changes coordinates but not lawful achievable throughput',()=>{
 const base=graph(),result=solveConservedCapacityFlow(base);
 const changed={...base,nodes:[...base.nodes].reverse(),
  links:[...base.links].reverse()};
 const alternate=solveConservedCapacityFlow(changed);
 assert.equal(alternate.maxRoutable,result.maxRoutable);
 assert.equal(alternate.minCut.capacity,result.minCut.capacity);
 // This is relabeling invariance, NOT a Klein-four authorization transform.
 const renamed={source:'orig',exclusive:'special',flexible:'loose',
  'red-cup-gpu':'gpu','cloud-free-cpu':'free',sink:'done'};
 const change=key=>renamed[key];
 const relabeled=solveConservedCapacityFlow({
  ...base,nodes:base.nodes.map(change),
  source:change(base.source),sink:change(base.sink),
  links:base.links.map(e=>({...e,from:change(e.from),to:change(e.to)}))
 });
 assert.equal(relabeled.maxRoutable,result.maxRoutable);
 assert.equal(relabeled.minCut.capacity,result.minCut.capacity);
});

test('finite structural proof fails closed on invented coordinates, invalid natural counts and duplicated links',()=>{
 const packet=graph();
 for(const corrupted of [
  {...packet,links:[...packet.links,{id:'unknown',from:'ghost',to:'sink',capacity:'1'}]},
  {...packet,links:[...packet.links,packet.links[0]]},
  {...packet,links:packet.links.map((x,i)=>i?x:{...x,capacity:'1.2'})},
  {...packet,links:packet.links.map((x,i)=>i?x:{...x,capacity:'-1'})},
  {...packet,nodes:['source','source','sink']},
  {...packet,source:'sink'},
  {...packet,links:[...packet.links,{id:'illegal-reverse',from:'sink',to:'source',capacity:'1'}]}
 ])assert.throws(()=>solveConservedCapacityFlow(corrupted),TypeError);
});


test('compute actual fair multi-source throughput instead of just detecting shared overcapacity',()=>{
 const r=allocateFairSharedSources({
  unit:'atoms:water',
  sources:[{id:'shared',capacity:'5'},{id:'lineA',capacity:'5'},{id:'lineB',capacity:'5'}],
  routes:[
   {id:'delivery-A',demand:'4',uses:['shared','lineA']},
   {id:'delivery-B',demand:'4',uses:['shared','lineB']},
  ],
 });
 assert.equal(r.totalDemand,'8');
 assert.equal(r.totalAllocated,'5');
 assert.equal(r.totalUnserved,'3');
 assert.deepEqual(r.routes.map(x=>x.allocated),['2','3']);
 assert.deepEqual(r.routes.map(x=>x.idealAtoms),[
  {numerator:'5',denominator:'2'},{numerator:'5',denominator:'2'},
 ]);
 assert.equal(r.sources.find(s=>s.id==='shared').remaining,'0');
 assert.equal(r.fairness.integerRoundOptimal,true);
 assert.equal(r.fairness.method,'exact-weighted-max-min-progressive-filling');
});

test('optimal integer rounding selects two nonconflicting paths over a double-counting path',()=>{
 const r=allocateFairSharedSources({
  unit:'compute-slots',
  sources:[{id:'east',capacity:'1'},{id:'west',capacity:'1'}],
  routes:[
   {id:'combined',demand:'1',uses:['east','west']},
   {id:'east-only',demand:'1',uses:['east']},
   {id:'west-only',demand:'1',uses:['west']},
  ],
 });
 assert.equal(r.totalAllocated,'2');
 assert.deepEqual(r.routes.map(x=>[x.id,x.allocated]),[
  ['combined','0'],['east-only','1'],['west-only','1'],
 ]);
 assert.equal(r.fairness.integerRoundOptimal,true);
 assert.equal(r.sources.every(s=>s.allocated==='1'),true);
});

test('source-response geometry finds paired upgrades invisible to individual gradients',()=>{
 const input={
  unit:'inference-tokens',
  sources:[{id:'model-capacity',capacity:'1'},{id:'power-capacity',capacity:'1'}],
  routes:[{id:'model-generation',demand:'2',uses:['model-capacity','power-capacity']}],
  probeSourceIds:['model-capacity','power-capacity'],
 };
 const response=capacityUpgradeResponse(input);
 assert.equal(response.baselineAllocatedAtoms,'1');
 assert.deepEqual(response.firstDifferences.map(x=>x.marginalGainAtoms),['0','0']);
 assert.equal(response.secondDifferences[0].mixedDifferenceAtoms,'1');
 assert.equal(response.secondDifferences[0].combinedAllocatedAtoms,'2');
 assert.equal(response.secondDifferences[0].interpretation,'complementary-bottlenecks');
 assert.equal(response.allIntegerRoundingsOptimal,true);
 const independent=capacityUpgradeResponse({
  ...input,
  routes:[
   {id:'one',demand:'3',uses:['model-capacity']},
   {id:'two',demand:'3',uses:['power-capacity']},
  ],
 });
 assert.deepEqual(independent.firstDifferences.map(x=>x.marginalGainAtoms),['1','1']);
 assert.equal(independent.secondDifferences[0].mixedDifferenceAtoms,'0');
});
