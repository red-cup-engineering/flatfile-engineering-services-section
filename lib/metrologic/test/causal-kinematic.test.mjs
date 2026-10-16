import {test} from "node:test";
import assert from "node:assert/strict";
import {causalFrontiersOf,kinematicDiamondSpaceOf as K,kinematicReadoutRegionsOf} from
  "../src/articulation/predicating/positing/settling/analysis/causal.mjs";

const point=p=>[p.lowerEventIndex,p.upperEventIndex];
const links=k=>k.sequencing.map(({parent,child})=>[point(k.points[parent]),point(k.points[child])]);

test("strict intervals differ from nesting and preserve equal upper endpoints",()=>{
 const k=K({eventCount:3,edges:[{parent:0,child:1},{parent:1,child:2}]});
 assert.equal(k.kind,"metrologic.finiteKinematicDiamondSpace.v1");
 assert.deepEqual(k.points.map(point),[[0,1],[0,2],[1,2]]);
 assert.deepEqual(links(k),[[[0,1],[1,2]]]);
 assert.deepEqual(k.causalFrontiers.map(x=>x.eventIndices),[[0,1],[2]]);
 assert.equal(k.causalHeight,2);
 assert.ok(!k.sequencing.some(e=>e.parent===1||e.child===1));
});
test("source causal diamond produces two sequenced incomparable intervals",()=>{
 const k=K({eventCount:4,edges:[
  {parent:0,child:1},{parent:0,child:2},
  {parent:1,child:3},{parent:2,child:3}]});
 assert.deepEqual(k.points.map(point),[[0,1],[0,2],[0,3],[1,3],[2,3]]);
 assert.deepEqual(links(k),[[[0,1],[1,3]],[[0,2],[2,3]]]);
 assert.equal(k.causalHeight,2);
 assert.ok(Object.isFrozen(k)&&Object.isFrozen(k.points)&&Object.isFrozen(k.sequencing));
});
test("causal frontier is a topological antichain stratification, not a clock",()=>{
 const s=causalFrontiersOf({eventCount:4,edges:[
  {parent:1,child:3},{parent:0,child:2},{parent:0,child:1},{parent:2,child:3}]});
 assert.deepEqual(s.ranks,[0,1,1,2]);
 assert.deepEqual(s.frontiers.map(x=>x.eventIndices),[[0],[1,2],[3]]);
 const isolated=causalFrontiersOf({eventCount:3,edges:[]});
 assert.deepEqual(isolated.frontiers[0].eventIndices,[0,1,2]);
});
test("enumerates ALL 1099 topologically indexed DAGs through five events against independent Floyd-Warshall",()=>{
 let graphs=0;
 for(let n=0;n<=5;n++){
  const choices=[];
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)choices.push([a,b]);
  for(let mask=0;mask<2**choices.length;mask++){
   graphs++;
   const edges=choices.filter((_,i)=>(mask&(1<<i))!==0).map(([parent,child])=>({parent,child}));
   const reaches=Array.from({length:n},()=>Array(n).fill(false));
   for(const {parent,child} of edges)reaches[parent][child]=true;
   for(let mid=0;mid<n;mid++)for(let a=0;a<n;a++)for(let b=0;b<n;b++)
     if(reaches[a][mid]&&reaches[mid][b])reaches[a][b]=true;
   const expectedPoints=[];
   for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)
     if(reaches[a][b])expectedPoints.push([a,b]);
   const expectedSeq=[];
   for(let p=0;p<expectedPoints.length;p++)for(let q=p+1;q<expectedPoints.length;q++)
     if(expectedPoints[p][1]===expectedPoints[q][0]||reaches[expectedPoints[p][1]][expectedPoints[q][0]])
       expectedSeq.push([p,q]);
   const actual=K({eventCount:n,edges});
   assert.deepEqual(actual.points.map(point),expectedPoints,"points n="+n+" mask="+mask);
   assert.deepEqual(actual.sequencing.map(x=>[x.parent,x.child]),expectedSeq,"seq n="+n+" mask="+mask);
   // Obsmetrologia DiamondBeads: every strict interval gets one lawful pass,
   // while its bead-thread adjacency IS the already-derived sequencing.
   assert.deepEqual(actual.beadThread,expectedPoints.map((_,pointIndex)=>({
     pointIndex,inPort:false,outPort:true,
   })),"bead passes n="+n+" mask="+mask);
   assert.strictEqual(actual.beadThreadAdjacency,actual.sequencing);
   assert.ok(actual.beadThread.every(pass=>pass.inPort!==pass.outPort));
   assert.ok(Object.isFrozen(actual.beadThread)&&
     actual.beadThread.every(Object.isFrozen));
   for(const {parent,child} of actual.sequencing)
     assert.ok(actual.causalRanks[parent]<actual.causalRanks[child]);
  }
 }
 assert.equal(graphs,1100); // includes the empty event graph in addition to 1099 nonempty DAGs
});
test("rejects unlicensed cycle-shaped indices, repeat edges, unknown and oversized inputs",()=>{
 assert.throws(()=>K({eventCount:33,edges:[]}),/bounded to 32/);
 assert.throws(()=>K({eventCount:2,edges:[{parent:1,child:0}]}),/earlier event/);
 assert.throws(()=>K({eventCount:2,edges:[{parent:0,child:1},{parent:0,child:1}]}),/duplicate/);
 assert.throws(()=>K({eventCount:2,edges:[{parent:0,child:3}]}),/earlier event/);
 assert.deepEqual(K({eventCount:0,edges:[]}).points,[]);
});


test("readout of kinematic diamonds yields genuine future-closed holes and shroud, without collapsing long-jump points",()=>{
 const k=K({eventCount:3,edges:[{parent:0,child:1},{parent:1,child:2}]});
 // K chain: points [(0,1),(0,2),(1,2)], sequencing (0,1)->(1,2).
 const result=kinematicReadoutRegionsOf(k,[0]);
 assert.equal(result.kind,"metrologic.kinematicReadoutRegions.v1");
 assert.deepEqual(result.readoutPointIndices,[0]);
 assert.deepEqual(result.exteriorPointIndices,[0]);
 assert.deepEqual(result.holePointIndices,[1,2]);
 assert.deepEqual(result.shroudPointIndices,[2]);
 assert.deepEqual(result.unshroudedHolePointIndices,[1]);
 assert.deepEqual(result.shroudWitnesses,[{exteriorPredecessorIndex:0,shroudPointIndex:2}]);
 assert.ok(!k.sequencing.some(({parent,child})=>
   result.holePointIndices.includes(parent) && result.exteriorPointIndices.includes(child)),
   "a no-readout hole cannot reach exterior");
});
test("explicit empty readout differs from absent selection; arbitrary or duplicate points are refused",()=>{
 const k=K({eventCount:3,edges:[{parent:0,child:1},{parent:1,child:2}]});
 const empty=kinematicReadoutRegionsOf(k,[]);
 assert.deepEqual(empty.exteriorPointIndices,[]);
 assert.deepEqual(empty.holePointIndices,[0,1,2]);
 assert.deepEqual(empty.shroudPointIndices,[]);
 assert.throws(()=>kinematicReadoutRegionsOf(k,undefined),/explicit array/);
 assert.throws(()=>kinematicReadoutRegionsOf(k,[3]),/unknown point/);
 assert.throws(()=>kinematicReadoutRegionsOf(k,[-1]),/unknown point/);
 assert.throws(()=>kinematicReadoutRegionsOf(k,[0,0]),/duplicate/);
 assert.throws(()=>kinematicReadoutRegionsOf({kind:"incorrect"},[0]),/finite diamond-space/);
});

test("a forged kinematic presentation cannot erase a witnessed shroud",()=>{
 const k=K({eventCount:3,edges:[{parent:0,child:1},{parent:1,child:2}]});
 assert.deepEqual(kinematicReadoutRegionsOf(k,[0]).shroudPointIndices,[2]);
 assert.throws(()=>kinematicReadoutRegionsOf({...k,sequencing:[]},[0]),/canonical causal geometry/);
 assert.throws(()=>kinematicReadoutRegionsOf({...k,causalRanks:[0,0,0]},[0]),/canonical causal geometry/);
 assert.throws(()=>kinematicReadoutRegionsOf({...k,causalFrontiers:[]},[0]),/canonical causal geometry/);
});
test("source geometry must include transitive intervals and valid bounds",()=>{
 const k=K({eventCount:4,edges:[{parent:0,child:1},{parent:1,child:2},{parent:2,child:3}]});
 const missing=k.points.filter(p=>!(p.lowerEventIndex===0 && p.upperEventIndex===3));
 assert.throws(()=>kinematicReadoutRegionsOf({...k,points:missing,pointCount:missing.length},[]),/canonical causal geometry/);
 assert.throws(()=>kinematicReadoutRegionsOf({...k,sourceEventCount:2},[]),/strict endpoints/);
 assert.throws(()=>kinematicReadoutRegionsOf({...k,pointCount:497,points:Array(497).fill(k.points[0])},[]),/bounded source geometry/);
});
test("all 1100 forward DAGs through five events retain canonical readout",()=>{
 let count=0;
 for(let n=0;n<=5;n++){
  const edges=[];for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)edges.push({parent:a,child:b});
  for(let mask=0;mask<2**edges.length;mask++){
   const k=K({eventCount:n,edges:edges.filter((_,i)=>!!(mask&(1<<i)))});
   const none=kinematicReadoutRegionsOf(k,[]);
   assert.equal(none.holePointIndices.length,k.pointCount);
   assert.deepEqual(none.exteriorPointIndices,[]);
   if(k.pointCount){
    const selected=kinematicReadoutRegionsOf(k,[0]);
    assert.deepEqual(selected.readoutPointIndices,[0]);
   }
   count++;
  }
 }
 assert.equal(count,1100);
});
