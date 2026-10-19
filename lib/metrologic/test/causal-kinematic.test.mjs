import {test} from "node:test";
import assert from "node:assert/strict";
import {causalFrontiersOf,kinematicDiamondSpaceOf as K,kinematicReadoutRegionsOf,kinematicBeadStrandsOf,kinematicBeadCoverAdmits,kinematicDiamondTransportOf,kinematicBeadCoverTransportOf,kinematicPastWallMetricOf,kinematicPastWallAngleOf} from
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
   // A single list of individually legal passes is not a sequenced walk.
   // Construct the minimum NUMBER of genuine compatible strands instead.
   const cover=kinematicBeadStrandsOf(actual);
   const visited=cover.strands.flat().map(pass=>pass.pointIndex).sort((a,b)=>a-b);
   assert.deepEqual(visited,expectedPoints.map((_,i)=>i),
     "each diamond threaded exactly once n="+n+" mask="+mask);
   const sequencePairs=new Set(expectedSeq.map(([i,j])=>i+":"+j));
   for(const strand of cover.strands){
     assert.ok(Object.isFrozen(strand));
     for(const pass of strand)assert.ok(pass.inPort!==pass.outPort);
     for(let i=1;i<strand.length;i++)
       assert.ok(sequencePairs.has(strand[i-1].pointIndex+":"+strand[i].pointIndex),
         "nonsequenced join n="+n+" mask="+mask);
   }
   // Independent antichain oracle, not a second implementation of matching.
   let width=0;
   for(let chosen=0;chosen<2**expectedPoints.length;chosen++){
     const subset=expectedPoints.map((_,i)=>i).filter(i=>(chosen&(1<<i))!==0);
     const incomparable=subset.every((p,i)=>subset.slice(i+1).every(q=>
       !sequencePairs.has(p+":"+q)&&!sequencePairs.has(q+":"+p)));
     if(incomparable)width=Math.max(width,subset.length);
   }
   assert.equal(cover.strandCount,width,
     "minimum strand count equals causal antichain width n="+n+" mask="+mask);
   const dual=kinematicBeadCoverAdmits(actual,cover);
   assert.equal(dual.admitted,true,"dual witnesses admit n="+n+" mask="+mask);
   assert.equal(dual.upperBound,cover.strandCount);
   assert.equal(dual.lowerBound,cover.maximumAntichain.length);
   assert.equal(cover.maximumAntichain.length,width);
   const antichainIndices=cover.maximumAntichain.map(pass=>pass.pointIndex);
   assert.equal(new Set(antichainIndices).size,width);
   for(const p of cover.maximumAntichain)
     assert.deepEqual(p,actual.beadThread[p.pointIndex]);
   for(let i=0;i<antichainIndices.length;i++)
     for(let j=i+1;j<antichainIndices.length;j++)
       assert.ok(!sequencePairs.has(antichainIndices[i]+":"+antichainIndices[j])&&
         !sequencePairs.has(antichainIndices[j]+":"+antichainIndices[i]),
         "antichain members incomparable n="+n+" mask="+mask);
   assert.equal(cover.strandCount,actual.pointCount-cover.matchedSequencing.length);
   for(const {parent,child} of actual.sequencing)
     assert.ok(actual.causalRanks[parent]<actual.causalRanks[child]);
  }
 }
 assert.equal(graphs,1100); // includes the empty event graph in addition to 1099 nonempty DAGs
});
test("bead strand cover exposes overlapping diamonds and refuses forged joins",()=>{
 const chain=K({eventCount:3,edges:[{parent:0,child:1},{parent:1,child:2}]});
 const cover=kinematicBeadStrandsOf(chain);
 assert.equal(chain.pointCount,3);
 assert.equal(cover.strandCount,2,"long causal intervals overlap and do not join");
 assert.deepEqual(cover.strands.map(s=>s.map(p=>p.pointIndex)),[[0,2],[1]]);
 assert.equal(cover.requiresMultipleStrands,true);
 assert.ok(Object.isFrozen(cover)&&Object.isFrozen(cover.strands));
 assert.deepEqual(kinematicBeadStrandsOf(K({eventCount:4,edges:[]})).strands,[]);
 assert.throws(()=>kinematicBeadStrandsOf({...chain,sequencing:[]}),
   /canonical causal geometry/);
 assert.throws(()=>kinematicBeadStrandsOf({...chain,beadThread:chain.beadThread.slice(1)}),
   /canonical causal geometry/);
 assert.throws(()=>kinematicBeadStrandsOf({...chain,beadThreadAdjacency:[]}),
   /canonical causal geometry/);
 assert.throws(()=>kinematicBeadStrandsOf({...chain,points:[chain.points[0]],pointCount:1}),
   /canonical causal geometry/);
 assert.throws(()=>kinematicBeadStrandsOf({...chain,sourceEventCount:2}),
   /invalid endpoint/);
 assert.throws(()=>kinematicBeadStrandsOf({kind:"some-other-claim"}),
   /bounded canonical diamond space/);
});

test("32-event linear source order has 496 diamond points but 256 incomparable bead strands",()=>{
 const k=K({eventCount:32,edges:Array.from({length:31},(_,i)=>({parent:i,child:i+1}))});
 const cover=kinematicBeadStrandsOf(k);
 assert.equal(k.pointCount,496);
 assert.equal(cover.pointCount,496);
 // The max antichain consists of intervals crossing the middle cut:
 // 16 possible lower endpoints times 16 possible upper endpoints.
 assert.equal(cover.strandCount,256);
 assert.equal(cover.matchedSequencing.length,240);
 assert.equal(cover.maximumAntichain.length,256);
 assert.deepEqual(kinematicBeadCoverAdmits(k,cover),{
   kind:"metrologic.kinematicBeadCoverAdmission.v1",
   admitted:true,pointCount:496,lowerBound:256,upperBound:256,
 });
 // All 16x16 strict intervals crossing the middle cut form an antichain.
 assert.ok(cover.maximumAntichain.every(({pointIndex})=>{
   const p=k.points[pointIndex];
   return p.lowerEventIndex<16&&p.upperEventIndex>=16;
 }));
 assert.equal(cover.requiresMultipleStrands,true);
 assert.deepEqual(cover.strands.flat().map(p=>p.pointIndex).sort((a,b)=>a-b),
   Array.from({length:496},(_,i)=>i));
});

test("independent receiver rejects forged causal bead duals without matching",()=>{
 const k=K({eventCount:4,edges:[
   {parent:0,child:1},{parent:1,child:2},{parent:2,child:3},
 ]});
 const c=kinematicBeadStrandsOf(k);
 const admit=alter=>kinematicBeadCoverAdmits(k,{...c,...alter});
 const deny=(alter,reason)=>{
   const result=admit(alter);
   assert.equal(result.admitted,false,reason);
   assert.equal(result.reason,reason);
 };
 assert.equal(admit({}).admitted,true);
 deny({maximumAntichain:c.maximumAntichain.slice(1)},"bounds-not-equal");
 deny({maximumAntichain:[...c.maximumAntichain,c.maximumAntichain[0]]},"bounds-not-equal");
 deny({maximumAntichain:c.strands.flat().slice(0,c.strandCount)},"comparable-antichain-members");
 deny({strands:[...c.strands,c.strands[0]]},"malformed-cover");
 deny({strands:[...c.strands.slice(0,-1)]},"malformed-cover");
 deny({matchedSequencing:[]},"incorrect-matching");
 deny({matchedSequencing:[...c.matchedSequencing,...c.matchedSequencing]},"incorrect-matching");
 deny({strandCount:c.strandCount+1},"malformed-cover");
 const modified=c.strands.map(s=>[...s]);
 modified[0][0]={...modified[0][0],inPort:true};
 deny({strands:modified},"invalid-or-duplicated-pass");
 assert.throws(()=>kinematicBeadCoverAdmits({...k,sequencing:[]},c),
   /canonical causal geometry/);
 assert.throws(()=>kinematicBeadCoverAdmits({...k,points:k.points.slice(1),
   pointCount:k.pointCount-1},c),/canonical causal geometry/);
 const empty=K({eventCount:2,edges:[]});
 assert.deepEqual(kinematicBeadCoverAdmits(empty,kinematicBeadStrandsOf(empty)),{
   kind:"metrologic.kinematicBeadCoverAdmission.v1",
   admitted:true,pointCount:0,lowerBound:0,upperBound:0,
 });
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

test("strict-causal K(f) preserves identity on ALL 1100 finite forward DAGs",()=>{
 let checked=0;
 for(let n=0;n<=5;n++){
   const choices=[];for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)
     choices.push({parent:a,child:b});
   for(let mask=0;mask<2**choices.length;mask++){
     const k=K({eventCount:n,edges:choices.filter((_,i)=>mask&(1<<i))});
     const id=Array.from({length:n},(_,i)=>i);
     const mapped=kinematicDiamondTransportOf(k,k,id);
     assert.deepEqual(mapped.eventMap,id);
     assert.deepEqual(mapped.pointMap,k.points.map((_,i)=>i));
     assert.deepEqual(mapped.identifiedPoints,[]);
     assert.deepEqual(mapped.newlyComparable,[]);
     assert.deepEqual(mapped.unmappedTargetPoints,[]);
     assert.equal(mapped.orderEmbeddingOnPoints,true);
     assert.equal(mapped.surjectiveOnPoints,true);
     checked++;
   }
 }
 assert.equal(checked,1100);
});

test("ALL small causal maps have precisely the strict-pair preservation admission rule",()=>{
 const universe=n=>{
   const edges=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)edges.push({parent:i,child:j});
   return Array.from({length:2**edges.length},(_,mask)=>
     edges.filter((_,i)=>mask&(1<<i)));
 };
 const reach=(n,edges)=>{
   // Independent Floyd-Warshall strict-reachability oracle.
   const m=Array.from({length:n},()=>Array(n).fill(false));
   for(const {parent,child} of edges)m[parent][child]=true;
   for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)
     if(m[i][k]&&m[k][j])m[i][j]=true;
   return m;
 };
 let admitted=0,refused=0;
 for(let n=0;n<=3;n++)for(const srcEdges of universe(n)){
   const C=K({eventCount:n,edges:srcEdges});
   const sourceRelation=reach(n,srcEdges);
   for(let m=0;m<=3;m++)for(const targetEdges of universe(m)){
     const D=K({eventCount:m,edges:targetEdges});
     const targetRelation=reach(m,targetEdges);
     for(let code=0;code<m**n;code++){
       let rest=code,map=[];
       for(let i=0;i<n;i++){map.push(rest%m);rest=Math.floor(rest/m);}
       const shouldAdmit=sourceRelation.every((row,a)=>row.every((strict,b)=>
         !strict||targetRelation[map[a]]?.[map[b]]===true));
       let outcome;
       try{outcome=kinematicDiamondTransportOf(C,D,map);}
       catch(error){
         assert.match(error.message,/destroys strict causal diamond/);
       }
       assert.equal(outcome!==undefined,shouldAdmit,
         "admission n="+n+" m="+m+" code="+code);
       if(!outcome){refused++;continue;}
       admitted++;
       assert.equal(outcome.pointMap.length,C.pointCount);
       for(let i=0;i<C.pointCount;i++){
         const sourcePoint=C.points[i],targetPoint=D.points[outcome.pointMap[i]];
         assert.deepEqual(point(targetPoint),[
           map[sourcePoint.lowerEventIndex],map[sourcePoint.upperEventIndex],
         ]);
       }
       const targetSeq=new Set(D.sequencing.map(e=>e.parent+":"+e.child));
       for(const {parent,child} of C.sequencing)
         assert.ok(targetSeq.has(outcome.pointMap[parent]+":"+outcome.pointMap[child]));
       assert.equal(outcome.unmappedTargetPoints.length===0,outcome.surjectiveOnPoints);
       assert.equal(outcome.identifiedPoints.length===0&&
         outcome.newlyComparable.length===0,outcome.orderEmbeddingOnPoints);
     }
   }
 }
 assert.equal(admitted,536);
 assert.equal(refused,1531);
});

test("kinematic transport composes, permits proper quotients, and exposes lost proof structure",()=>{
 const chain=(n)=>K({eventCount:n,edges:Array.from(
   {length:n-1},(_,i)=>({parent:i,child:i+1}))});
 const A=chain(3),B=chain(4),C=chain(5);
 const f=[0,2,3],g=[1,2,3,4];
 const F=kinematicDiamondTransportOf(A,B,f);
 const G=kinematicDiamondTransportOf(B,C,g);
 const GF=kinematicDiamondTransportOf(A,C,f.map(i=>g[i]));
 assert.deepEqual(GF.pointMap,F.pointMap.map(i=>G.pointMap[i]),
   "K(g o f) equals K(g) o K(f)");
 assert.equal(F.orderEmbeddingOnPoints,true);
 assert.equal(F.surjectiveOnPoints,false);
 const fork=K({eventCount:3,edges:[
   {parent:0,child:2},{parent:1,child:2},
 ]});
 const collapse=kinematicDiamondTransportOf(fork,A,[0,0,2]);
 assert.equal(collapse.identifiedPoints.length,1,
   "incomparable source events may share a target");
 assert.equal(collapse.orderEmbeddingOnPoints,false);
 assert.deepEqual(collapse.identifiedPoints[0].sourcePointIndices,[0,1]);
 const separated=K({eventCount:4,edges:[
   {parent:0,child:1},{parent:2,child:3},
 ]});
 const dense=kinematicDiamondTransportOf(separated,B,[0,1,2,3]);
 assert.equal(dense.newlyComparable.length,1,
   "new target relations make formerly incomparable beads sequenceable");
 assert.equal(dense.orderEmbeddingOnPoints,false);
 const oldAntichain=kinematicBeadStrandsOf(separated).maximumAntichain;
 assert.equal(oldAntichain.length,2);
 assert.equal(new Set(oldAntichain.map(pass=>dense.pointMap[pass.pointIndex])).size,2);
 assert.ok(dense.newlyComparable.some(p=>
   p.sourceParent===oldAntichain[0].pointIndex&&
   p.sourceChild===oldAntichain[1].pointIndex),
   "do NOT transplant an old width certificate into a changed K(C)");
 assert.throws(()=>kinematicDiamondTransportOf(A,K({eventCount:2,edges:[]}),
   [0,0,1]),/destroys strict causal diamond/);
 assert.throws(()=>kinematicDiamondTransportOf(A,A,[0,0,2]),
   /destroys strict causal diamond/);
 assert.throws(()=>kinematicDiamondTransportOf(A,A,[0,1]),/total indexed/);
 assert.throws(()=>kinematicDiamondTransportOf(A,A,Array(3)),
   /total indexed/);
 assert.throws(()=>kinematicDiamondTransportOf({...A,sequencing:[]},A,[0,1,2]),
   /canonical causal geometry/);
});

test("all 1100 finite K(C) identities preserve admitted minimum bead covers without rematching",()=>{
 let cases=0;
 for(let n=0;n<=5;n++){
   const choices=[];for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)choices.push({parent:a,child:b});
   for(let mask=0;mask<2**choices.length;mask++){
     const k=K({eventCount:n,edges:choices.filter((_,i)=>mask&(1<<i))});
     const old=kinematicBeadStrandsOf(k);
     const same=kinematicBeadCoverTransportOf(k,k,
       Array.from({length:n},(_,i)=>i),old);
     assert.equal(same.reusedMatching,true);
     assert.equal(same.sourceAdmission.admitted,true);
     assert.equal(same.targetAdmission.admitted,true);
     assert.equal(same.targetAdmission.upperBound,old.strandCount);
     assert.equal(same.targetAdmission.lowerBound,old.maximumAntichain.length);
     assert.deepEqual(same.cover.strands,old.strands);
     assert.deepEqual(same.cover.maximumAntichain,old.maximumAntichain);
     assert.ok(Object.isFrozen(same)&&Object.isFrozen(same.cover));
     cases++;
   }
 }
 assert.equal(cases,1100);
});

test("K isomorphisms reuse actual strands under causal automorphism, extension and composition",()=>{
 const C=K({eventCount:4,edges:[
   {parent:0,child:1},{parent:0,child:2},
   {parent:1,child:3},{parent:2,child:3},
 ]});
 const source=kinematicBeadStrandsOf(C);
 const swap=[0,2,1,3];
 const first=kinematicBeadCoverTransportOf(C,C,swap,source);
 const twice=kinematicBeadCoverTransportOf(C,C,swap,first.cover);
 assert.equal(first.transport.orderEmbeddingOnPoints,true);
 assert.equal(first.transport.surjectiveOnPoints,true);
 assert.ok(first.transport.pointMap.some((p,i)=>p!==i));
 assert.equal(first.cover.strandCount,source.strandCount);
 assert.deepEqual(twice.cover.strands,source.strands);
 assert.deepEqual(twice.cover.maximumAntichain,source.maximumAntichain);

 const separated=K({eventCount:4,edges:[
   {parent:0,child:1},{parent:2,child:3},
 ]});
 // Adding a disconnected target event changes raw event count but not K(C).
 const extended=K({eventCount:5,edges:[
   {parent:0,child:1},{parent:2,child:3},
 ]});
 const received=kinematicBeadCoverTransportOf(separated,extended,[0,1,2,3],
   kinematicBeadStrandsOf(separated));
 assert.equal(received.transport.sourceEventCount,4);
 assert.equal(received.transport.targetEventCount,5);
 assert.equal(received.transport.orderEmbeddingOnPoints,true);
 assert.equal(received.transport.surjectiveOnPoints,true);
 assert.equal(received.targetAdmission.lowerBound,2);
});

test("immutable source fast path never admits forged wrappers or bypasses JSON receiving",()=>{
 const k=K({eventCount:4,edges:[
   {parent:0,child:1},{parent:1,child:2},{parent:2,child:3},
 ]});
 const cover=kinematicBeadStrandsOf(k);
 const order=[0,1,2,3];
 const direct=kinematicBeadCoverTransportOf(k,k,order,cover);
 assert.equal(direct.targetAdmission.admitted,true);
 // Serialization erases private provider identity, not mathematical content:
 // full independent admission accepts real clones.
 const restored=JSON.parse(JSON.stringify(k));
 const restoredCover=JSON.parse(JSON.stringify(cover));
 assert.equal(kinematicBeadCoverAdmits(restored,restoredCover).admitted,true);
 const received=kinematicBeadCoverTransportOf(
   restored,restored,order,restoredCover);
 assert.equal(received.targetAdmission.admitted,true);
 assert.equal(received.targetAdmission.lowerBound,cover.strandCount);
 // A shallow clone is NOT a cached trusted source. It must be compared
 // against canonical construction, including sequencing and all ranks.
 const forged={...k,sequencing:[]};
 assert.throws(()=>kinematicBeadCoverTransportOf(forged,k,order,cover),
   /canonical causal geometry/);
 const forgedCover={...cover,maximumAntichain:[]};
 assert.throws(()=>kinematicBeadCoverTransportOf(k,k,order,forgedCover),
   /source bead cover is unqualified/);
 const falseCertificate=JSON.parse(JSON.stringify(cover));
 falseCertificate.strands[0][0].inPort=true;
 assert.equal(kinematicBeadCoverAdmits(restored,falseCertificate).admitted,false);
 assert.throws(()=>kinematicBeadCoverTransportOf(
   restored,restored,order,falseCertificate),
   /source bead cover is unqualified/);
});

test("a lawful non-isomorphism or false lower bound never carries an old optimal cover",()=>{
 const separated=K({eventCount:4,edges:[
   {parent:0,child:1},{parent:2,child:3},
 ]});
 const source=kinematicBeadStrandsOf(separated);
 const dense=K({eventCount:4,edges:[
   {parent:0,child:1},{parent:1,child:2},{parent:2,child:3},
 ]});
 assert.equal(kinematicDiamondTransportOf(separated,dense,[0,1,2,3]).
   orderEmbeddingOnPoints,false);
 assert.throws(()=>kinematicBeadCoverTransportOf(separated,dense,[0,1,2,3],source),
   /order isomorphism/);
 const tiny=K({eventCount:2,edges:[{parent:0,child:1}]});
 assert.throws(()=>kinematicBeadCoverTransportOf(tiny,dense,[0,1],
   kinematicBeadStrandsOf(tiny)),/order isomorphism/);
 assert.throws(()=>kinematicBeadCoverTransportOf(
   separated,separated,[0,1,2,3],{...source,maximumAntichain:[]}),
   /source bead cover is unqualified/);
 const fork=K({eventCount:3,edges:[
   {parent:0,child:2},{parent:1,child:2},
 ]});
 const chain=K({eventCount:3,edges:[
   {parent:0,child:1},{parent:1,child:2},
 ]});
 assert.throws(()=>kinematicBeadCoverTransportOf(fork,chain,[0,0,2],
   kinematicBeadStrandsOf(fork)),/order isomorphism/);
 assert.throws(()=>kinematicBeadCoverTransportOf({...separated,sequencing:[{parent:0,child:1}]},
   separated,[0,1,2,3],source),/canonical causal geometry/);
});

test("canonical K(C) exposes pure finite wall metric and trigonometric shadows without trusting forged copies", () => {
 const space=K({eventCount:3,edges:[{parent:0,child:1},{parent:1,child:2}]});
 const wall=kinematicPastWallMetricOf(space);
 assert.equal(wall.kind,"metrologic.finitePastWallMetric.v1");
 assert.deepEqual(wall.principalPastPointIndices,[[0],[1],[0,2]]);
 assert.deepEqual(wall.distanceCounts,[[0,2,1],[2,0,3],[1,3,0]]);
 const angle=kinematicPastWallAngleOf(space,{vertex:0,first:1,second:2});
 assert.equal(angle.dotProduct,0);
 assert.equal(angle.cosineApproximation,0);
 const fromJSON=JSON.parse(JSON.stringify(space));
 assert.deepEqual(kinematicPastWallMetricOf(fromJSON).distanceCounts,wall.distanceCounts);
 assert.throws(()=>kinematicPastWallMetricOf({...space,sequencing:[]}),/canonical causal geometry/);
 assert.throws(()=>kinematicPastWallAngleOf({...space,points:[...space.points].reverse()},{vertex:0,first:1,second:2}),/canonical causal geometry/);
});
