import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kinematicDiamondSpaceOf,
  kinematicCroftonChartOf,
  kinematicCroftonBoundaryPacketOf,
  kinematicCroftonDecodeOf,
  kinematicCroftonOverlapOf,
  kinematicCroftonGlueOf,
} from "../src/articulation/predicating/positing/settling/analysis/causal.mjs";
import { finiteKinematicCroftonChartOf } from
  "../src/articulation/predicating/positing/settling/analysis/causal-crofton.mjs";

const chain = kinematicDiamondSpaceOf({
  eventCount: 6,
  edges: Array.from({ length: 5 }, (_, i) => ({ parent:i, child:i+1 })),
});
const chart = {
  leftEventIndices: [0,1,2], rightEventIndices: [3,4,5],
  observable: { sourceRef:"regression:source-replayed-chain", revision:"v1", unit:"synthetic-int" },
};
const measure = values => kinematicCroftonChartOf(chain,{...chart,intervalValues:values});

test("source K(C) chain yields an exact mixed-contrast reconstruction with boundary gauge", () => {
  const values=[[9,16,25],[4,9,16],[1,4,9]];
  const result=measure(values);
  assert.equal(result.kind,"metrologic.kinematicFiniteCroftonContrast.v1");
  assert.deepEqual(result.leftEventIndices,[0,1,2]);
  assert.deepEqual(result.rightEventIndices,[3,4,5]);
  assert.deepEqual(result.pointIndices,
    [[2,3,4],[6,7,8],[9,10,11]]);
  assert.deepEqual(result.firstRow,["9","16","25"]);
  assert.deepEqual(result.firstColumn,["9","4","1"]);
  assert.deepEqual(result.mixedContrasts,[["-2","-2"],["-2","-2"]]);
  assert.equal(result.gaugeRank,5);
  assert.equal(result.mixedContrastRank,4);
  assert.equal(result.totalContrast,"-8");
  assert.equal(result.fourCornerContrast,"-8");
  assert.equal(result.allContrastsNonnegative,false);
  assert.deepEqual(result.reconstructedValues,values.map(row=>row.map(String)));
  assert.equal(result.physicalEntropy,"not-established-by-observation");
  assert.equal(result.croftonGeodesicMeasure,"not-established-by-interval-incidence");
  assert.ok(Object.isFrozen(result.pointIndices));
});

test("exact gauge transformations leave mixed contrasts unchanged on 10,000 interval tables", () => {
  for (let t=0;t<10_000;t++) {
    const values=Array.from({length:3},(_,i)=>
      Array.from({length:3},(_,j)=>((t*(i+17)*(j+5))%23)-10));
    const gaugeShift=values.map((row,i)=>row.map((value,j)=>value+7*i-11*j+3));
    const a=measure(values),b=measure(gaugeShift);
    assert.deepEqual(a.mixedContrasts,b.mixedContrasts);
    assert.deepEqual(a.reconstructedValues,values.map(row=>row.map(String)));
    assert.deepEqual(b.reconstructedValues,gaugeShift.map(row=>row.map(String)));
  }
});

test("sign of an arbitrary interval contrast cannot be promoted to conditional mutual information", () => {
  const positive=measure([[0,0,0],[0,1,1],[0,1,2]]);
  assert.deepEqual(positive.mixedContrasts,[["1","0"],["0","1"]]);
  assert.equal(positive.allContrastsNonnegative,true);
  assert.equal(positive.physicalEntropy,"not-established-by-observation");
  const separable=measure([[3,4,5],[2,3,4],[1,2,3]]);
  assert.deepEqual(separable.mixedContrasts,[["0","0"],["0","0"]]);
  assert.equal(separable.totalContrast,"0");
});

test("branched K(C) refuses missing corners rather than inventing comparisons", () => {
  const diamond=kinematicDiamondSpaceOf({
    eventCount:4, edges:[
      {parent:0,child:1},{parent:0,child:2},
      {parent:1,child:3},{parent:2,child:3},
    ],
  });
  assert.throws(()=>kinematicCroftonChartOf(diamond,{
    leftEventIndices:[0,1],rightEventIndices:[2,3],
    intervalValues:[[1,2],[3,4]], observable:chart.observable,
  }),/missing strict interval corner/);
  assert.throws(()=>kinematicCroftonChartOf(diamond,{
    leftEventIndices:[0,2],rightEventIndices:[1,3],
    intervalValues:[[1,2],[3,4]], observable:chart.observable,
  }),/disjoint ordered endpoint windows/);
});

test("invalid source identity, incomplete observation and floats refuse", () => {
  const cloned={...chain, sequencing:[]};
  assert.throws(()=>kinematicCroftonChartOf(cloned,{
    ...chart,intervalValues:[[1,2,3],[4,5,6],[7,8,9]],
  }),/disagree with canonical causal geometry/);
  assert.throws(()=>measure([[1,2,3],[4,5,6]]),/cover all admitted chart corners/);
  assert.throws(()=>measure([[1,2,3],[4,"2.5",6],[7,8,9]]),/exact signed integers/);
  assert.throws(()=>measure([[1,2,3],[4,NaN,6],[7,8,9]]),/exact signed integers/);
  assert.throws(()=>kinematicCroftonChartOf(chain,{
    ...chart,observable:{sourceRef:"",revision:"v1",unit:"u"},
    intervalValues:[[1,2,3],[4,5,6],[7,8,9]],
  }),/requires sourceRef/);
  // Calling the lower-level pure function cannot attest source authority:
  // only the original causal.mjs adapter checks the canonical K(C).
  const raw=finiteKinematicCroftonChartOf(chain,{
    ...chart,intervalValues:[[1,2,3],[4,5,6],[7,8,9]],
  });
  assert.equal(raw.status,"conditional-mathematical-shadow");
});

test("boundary packet decodes without original interval table; no compression or authenticity implied", () => {
  const K=kinematicDiamondSpaceOf({
    eventCount:7,
    edges:Array.from({length:6},(_,i)=>({parent:i,child:i+1})),
  });
  const input={
    leftEventIndices:[0,1,2],
    rightEventIndices:[4,5,6],
    observable:{sourceRef:"native-source:chain",revision:"one",unit:"signed-int"},
    intervalValues:[[16,25,36],[9,16,25],[4,9,16]],
  };
  const original=kinematicCroftonChartOf(K,input);
  const packet=kinematicCroftonBoundaryPacketOf(K,input);
  assert.equal(packet.kind,"metrologic.kinematicFiniteCroftonBoundaryPacket.v1");
  assert.equal(Object.hasOwn(packet,"reconstructedValues"),false);
  assert.equal(packet.firstRow.length+packet.firstColumn.length-1+
    packet.mixedContrasts.flat().length,9,
    "coordinate count equals raw table size, so compression is not claimed");
  const restored=kinematicCroftonDecodeOf(K,packet);
  assert.deepEqual(restored.reconstructedValues,original.reconstructedValues);
  assert.deepEqual(restored.pointIndices,original.pointIndices);
  assert.equal(restored.authenticOriginalObservation,"not-attested-by-algebra");
});

test("overlapping original K(C) charts admit agreement, conflict and unknown without data laundering", () => {
  const K=kinematicDiamondSpaceOf({
    eventCount:7,edges:Array.from({length:6},(_,i)=>({parent:i,child:i+1})),
  });
  const observable={sourceRef:"measured-source",revision:"v1",unit:"one-unit"};
  const chart=(left,right,delta=0)=>kinematicCroftonBoundaryPacketOf(K,{
    leftEventIndices:left,rightEventIndices:right,observable,
    intervalValues:left.map(i=>right.map(j=>(j-i)*(j-i)+(delta&&i===1&&j===4?delta:0))),
  });
  const first=chart([0,1,2],[4,5,6]);
  const compatible=kinematicCroftonOverlapOf(K,first,chart([1,2,3],[4,5,6]));
  assert.equal(compatible.status,"compatible-on-overlap-only");
  assert.equal(compatible.overlapCount,6);
  assert.deepEqual(compatible.conflicts,[]);
  const conflict=kinematicCroftonOverlapOf(K,first,chart([1,2,3],[4,5,6],1));
  assert.equal(conflict.status,"incompatible-on-overlap");
  assert.equal(conflict.conflicts.length,1);
  const noOverlap=kinematicCroftonOverlapOf(K,
    chart([0,1],[3,4]),chart([1,2],[5,6]));
  assert.equal(noOverlap.status,"unassayed-no-overlap");
  assert.equal(noOverlap.overlapCount,0);
  const wrongRevision=Object.freeze({...first,
    observable:{sourceRef:"measured-source",revision:"v2",unit:"one-unit"}});
  assert.throws(()=>kinematicCroftonOverlapOf(K,first,wrongRevision),
    /one observation source, revision and unit/);
});

test("standalone decoder refuses missing gauge, forged K(C) interval provenance and malformed contrast shape", () => {
  const K=kinematicDiamondSpaceOf({
    eventCount:6,edges:Array.from({length:5},(_,i)=>({parent:i,child:i+1})),
  });
  const p=kinematicCroftonBoundaryPacketOf(K,{
    ...chart,intervalValues:[[9,16,25],[4,9,16],[1,4,9]],
  });
  assert.throws(()=>kinematicCroftonDecodeOf(K,{...p,firstColumn:p.firstColumn.slice(1)}),
    /complete gauge\/contrast coordinates/);
  assert.throws(()=>kinematicCroftonDecodeOf(K,{...p,firstColumn:["777",...p.firstColumn.slice(1)]}),
    /boundary gauge disagrees/);
  assert.throws(()=>kinematicCroftonDecodeOf(K,{...p,
    pointIndices:[[999,...p.pointIndices[0].slice(1)],...p.pointIndices.slice(1)]}),
    /contradicts source interval coordinates/);
  assert.throws(()=>kinematicCroftonDecodeOf(K,{...p,
    mixedContrasts:[["1"],...p.mixedContrasts.slice(1)]}),
    /complete gauge\/contrast coordinates/);
  const badSpace={...K,sequencing:[]};
  assert.throws(()=>kinematicCroftonDecodeOf(badSpace,p),
    /disagree with canonical causal geometry/);
});


test("finite atlas glues only equal readings, retains source fibers and marks uncovered K(C)", () => {
  const K=kinematicDiamondSpaceOf({eventCount:7,
    edges:Array.from({length:6},(_,i)=>({parent:i,child:i+1}))});
  const observable={sourceRef:"one-witnessed-observable",revision:"R1",unit:"exact-int"};
  const mk=(left,right,delta=0)=>kinematicCroftonBoundaryPacketOf(K,{
    leftEventIndices:left,rightEventIndices:right,observable,
    intervalValues:left.map(i=>right.map(j=>(j-i)**2+
      (delta && i===1 && j===4 ? delta : 0))),
  });
  const a=mk([0,1,2],[4,5,6]),b=mk([1,2,3],[4,5,6]);
  const coherent=kinematicCroftonGlueOf(K,[a,b]);
  assert.equal(coherent.status,"partial-union-only");
  assert.equal(coherent.sourcePointCount,21);
  assert.equal(coherent.observedPointCount,12);
  assert.equal(coherent.repeatedIncidences,6);
  assert.equal(coherent.uncoveredPointIndices.length,9);
  assert.deepEqual(coherent.conflicts,[]);
  assert.ok(coherent.records.some(r=>r.supportingPacketIndices.length===2));
  assert.equal(coherent.originalStateOrRights,"not-attested-by-algebra");

  const inconsistent=kinematicCroftonGlueOf(K,[a,mk([1,2,3],[4,5,6],1)]);
  assert.equal(inconsistent.status,"conflicted-refuse-global-assignment");
  assert.equal(inconsistent.conflicts.length,1);
  assert.deepEqual(inconsistent.records,[]);
  assert.equal(inconsistent.conflicts[0].firstValue,"9");
  assert.equal(inconsistent.conflicts[0].secondValue,"10");
  assert.throws(()=>kinematicCroftonGlueOf(K,[a,{...b,observable:{
    ...observable,revision:"R2",
  }}]),/same observation source, revision and unit/);
  assert.throws(()=>kinematicCroftonGlueOf(K,[]),/1..64 boundary packets/);
  assert.throws(()=>kinematicCroftonGlueOf({...K,sequencing:[]},[a]),
    /disagree with canonical causal geometry/);
});


test("76-digit source observations round-trip despite 77-digit mixed contrast", () => {
  const K=kinematicDiamondSpaceOf({eventCount:5,
    edges:Array.from({length:4},(_,i)=>({parent:i,child:i+1}))});
  const limit=BigInt("9".repeat(76));
  const input={
    leftEventIndices:[0,1],rightEventIndices:[3,4],
    observable:{sourceRef:"boundary-size-control",revision:"1",unit:"exact"},
    intervalValues:[[limit,-limit],[-limit,limit]],
  };
  const packet=kinematicCroftonBoundaryPacketOf(K,input);
  assert.equal(packet.mixedContrasts[0][0].length,77);
  assert.deepEqual(kinematicCroftonDecodeOf(K,packet).reconstructedValues,
    input.intervalValues.map(row=>row.map(String)));
  assert.throws(()=>kinematicCroftonBoundaryPacketOf(K,{
    ...input,intervalValues:[[BigInt("9".repeat(77)),0],[0,0]],
  }),/76 digits/);
  assert.throws(()=>kinematicCroftonDecodeOf(K,{
    ...packet,mixedContrasts:[["9".repeat(78)]],
  }),/77 digits/);
});
