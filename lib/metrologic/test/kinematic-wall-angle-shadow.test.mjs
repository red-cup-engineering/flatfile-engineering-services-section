import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kinematicDiamondSpaceOf, kinematicWallAngleShadowOf,
} from "../src/articulation/predicating/positing/settling/analysis/causal.mjs";

const K = (eventCount, edges) => kinematicDiamondSpaceOf({ eventCount, edges });
const sourceDiamond = () => K(4, [
  { parent:0, child:1 }, { parent:0, child:2 },
  { parent:1, child:3 }, { parent:2, child:3 },
]);
const angle = (space, vertexPointIndex, firstPointIndex, secondPointIndex, more={}) =>
  kinematicWallAngleShadowOf(space, { vertexPointIndex, firstPointIndex, secondPointIndex, ...more });

test("a derived causal-diamond antichain has a 60-degree COMPARISON angle, not an ambient tangent angle", () => {
  const k = sourceDiamond();
  assert.deepEqual(k.points.slice(0,3).map(x => [x.lowerEventIndex,x.upperEventIndex]),
    [[0,1],[0,2],[0,3]]);
  const out = angle(k,0,1,2);
  assert.equal(out.kind,"metrologic.kinematicWallAngleShadow.v1");
  assert.deepEqual(out.lengths,{first:"2",second:"2",opposite:"2"});
  assert.deepEqual(out.cosine,{numerator:"1",denominator:"2"});
  assert.deepEqual(out.sineSquared,{numerator:"3",denominator:"4"});
  assert.ok(Math.abs(out.angleDegreesApprox-60)<1e-10);
  assert.equal(out.status,"Euclidean-comparison-angle-only");
  assert.equal(out.physicalInterpretation,"not-claimed");
  assert.equal(out.orientation,"unrecoverable-from-distance");
  assert.ok(Object.isFrozen(out)&&Object.isFrozen(out.cosine)&&Object.isFrozen(out.lengths));
  assert.deepEqual(JSON.parse(JSON.stringify(out)),out,"wire carrier contains no BigInt");
});

test("the SAME causal order has different angular shadows under different declared cut measures", () => {
  const k=sourceDiamond();
  const equal=angle(k,0,1,2);
  const changed=angle(k,0,1,2,{wallWeights:[3,1,1,1,1]});
  assert.deepEqual(changed.lengths,{first:"4",second:"4",opposite:"2"});
  assert.deepEqual(changed.cosine,{numerator:"7",denominator:"8"});
  assert.ok(Math.abs(changed.angleDegreesApprox-28.95502437186)<1e-9);
  assert.notEqual(equal.angleDegreesApprox,changed.angleDegreesApprox);
  const uniform=angle(k,0,1,2,{wallWeights:[5,5,5,5,5]});
  assert.deepEqual(uniform.cosine,equal.cosine);
  assert.deepEqual(uniform.sineSquared,equal.sineSquared);
  assert.deepEqual(uniform.lengths,{first:"10",second:"10",opposite:"10"});
  assert.equal(uniform.measure,"caller-declared-principal-past-cuts");
});

test("a genuine finite-diamond order automorphism transports a measured angle exactly", () => {
  const k=sourceDiamond();
  // Swap the two incomparable middle base events; induced K(C) permutation
  // sends indices 0<->1 and 3<->4 while retaining point 2.
  const source=angle(k,0,1,2,{wallWeights:[3,1,2,4,5]});
  const target=angle(k,1,0,2,{wallWeights:[1,3,2,5,4]});
  assert.deepEqual(target.lengths,source.lengths,
    "isomorphic order and transported weights preserve all three cut distances");
  assert.deepEqual(target.cosine,source.cosine);
  assert.deepEqual(target.sineSquared,source.sineSquared);
  assert.equal(target.angleDegreesApprox,source.angleDegreesApprox);
});

test("comparison angles can be flat/degenerate without claiming linear or Euclidean geometry", () => {
  const k=K(3,[{parent:0,child:1},{parent:1,child:2}]);
  const out=angle(k,0,1,2);
  assert.deepEqual(out.lengths,{first:"2",second:"1",opposite:"3"});
  assert.deepEqual(out.cosine,{numerator:"-1",denominator:"1"});
  assert.deepEqual(out.sineSquared,{numerator:"0",denominator:"1"});
  assert.ok(Math.abs(out.angleDegreesApprox-180)<1e-10);
  const same=angle(k,0,1,1);
  assert.deepEqual(same.cosine,{numerator:"1",denominator:"1"});
  assert.ok(Math.abs(same.angleDegreesApprox)<1e-10);
});

test("exact BigInt wall calculations preserve rational data without unsafe floating input", () => {
  const k=sourceDiamond();
  const huge=angle(k,0,1,2,{
    wallWeights:["9999999999999999999999999999999999999","1","1","0","0"],
  });
  assert.equal(huge.lengths.first,"10000000000000000000000000000000000000");
  assert.equal(huge.cosine.denominator.includes("e"),false);
  assert.ok(huge.angleDegreesApprox>=0&&huge.angleDegreesApprox<=180);
  assert.throws(()=>angle(k,0,1,2,{wallWeights:[0,0,0,0,0]}),/zero-length leg/);
  for(const invalid of [[1,2], [1,1,1,-1,1], [1,1,1,Infinity,1],
     [1,1,1,0.4,1], [1,1,1,"bad",1]]) {
    assert.throws(()=>angle(k,0,1,2,{wallWeights:invalid}),/weights|weight vector/);
  }
  assert.throws(()=>angle(k,0,0,1),/nonzero distinct/);
  assert.throws(()=>angle(k,0,1,300),/actual finite kinematic point/);
  assert.throws(()=>angle(k,0,1,2,{wallWeights:[]}),/weight vector/);
});

test("untrusted forged K(C) arrows and missing source geometry do not enter the shadow", () => {
  const valid=sourceDiamond();
  assert.throws(()=>angle({...valid,sequencing:[]},0,1,2),/canonical causal geometry/);
  assert.throws(()=>angle({...valid,points:valid.points.slice(1)},0,1,2),/bounded canonical diamond/);
  assert.throws(()=>angle({kind:"metric",points:[]},0,1,2),/bounded canonical diamond/);
  assert.throws(()=>angle(K(2,[]),0,1,2),/actual finite kinematic point/);
});

/** Independent Floyd-Warshall reference, not the production closure or angle algorithm. */
function oracle(eventCount,edges,vertex,first,second) {
  const relation=Array.from({length:eventCount},()=>Array(eventCount).fill(false));
  for(const {parent,child} of edges)relation[parent][child]=true;
  for(let mid=0;mid<eventCount;mid++)
    for(let a=0;a<eventCount;a++)for(let b=0;b<eventCount;b++)
      if(relation[a][mid]&&relation[mid][b])relation[a][b]=true;
  const points=[];
  for(let a=0;a<eventCount;a++)for(let b=a+1;b<eventCount;b++)
    if(relation[a][b])points.push([a,b]);
  const predecessor = (from,to) => {
    const left=points[from],right=points[to];
    return left[1]===right[0]||relation[left[1]][right[0]];
  };
  const principal=point=>new Set(points.map((_p,i)=>i)
    .filter(i=>i===point||predecessor(i,point)));
  const p=[vertex,first,second].map(principal);
  const d=(i,j)=>BigInt(points.filter((_v,k)=>p[i].has(k)!==p[j].has(k)).length);
  const a=d(0,1),b=d(0,2),c=d(1,2);
  return {lengths:[a,b,c],numerator:a*a+b*b-c*c,denominator:2n*a*b};
}

test("all 1,100 forward DAGs through five events: comparison rational matches independent cut oracle", () => {
  let graphs=0,triples=0;
  for(let n=0;n<=5;n++){
    const choices=[];
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)choices.push([i,j]);
    for(let mask=0;mask<2**choices.length;mask++){
      graphs++;
      const edges=choices.filter((_e,i)=>(mask&(1<<i))!==0)
        .map(([parent,child])=>({parent,child}));
      const k=K(n,edges);
      if(k.pointCount<3)continue;
      const triplesToCheck=[[0,1,2],[k.pointCount-1,0,1]];
      for(const [vertex,first,second] of triplesToCheck){
        if(new Set([vertex,first,second]).size!==3)continue;
        const out=angle(k,vertex,first,second);
        const expected=oracle(n,edges,vertex,first,second);
        assert.deepEqual(Object.values(out.lengths),
          expected.lengths.map(String), "distance n="+n+" mask="+mask);
        assert.equal(BigInt(out.cosine.numerator)*expected.denominator,
          expected.numerator*BigInt(out.cosine.denominator),"cosine n="+n+" mask="+mask);
        assert.ok(out.angleDegreesApprox>=0&&out.angleDegreesApprox<=180);
        triples++;
      }
    }
  }
  assert.equal(graphs,1100);
  assert.ok(triples>100);
});
