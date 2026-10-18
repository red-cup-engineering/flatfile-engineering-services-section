import test from "node:test";
import assert from "node:assert/strict";
import {
  indexedKnowledgeRelation as mk,
  composeIndexedKnowledgeRelations as compose,
  leftResidualIndexedKnowledgeRelation as residualLeft,
  rightResidualIndexedKnowledgeRelation as residualRight,
  meetIndexedKnowledgeRelations as meet,
  leqIndexedKnowledgeRelations as leq,
} from "../src/indexed-knowledge-relations.mjs";

const one=(pos,neg)=>mk(1,1,pos?[[0,0]]:[],neg?[[0,0]]:[]);
test("all 64 FOUR combinations satisfy left and right adjunctions",()=>{
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let w=0;w<4;w++){
    const A=one(a&1,a&2),B=one(b&1,b&2),W=one(w&1,w&2);
    const lhs=leq(compose(A,W,[0]),B,[0],[0]);
    assert.equal(lhs,leq(W,residualLeft(A,B,[0]),[0],[0]));
    assert.equal(lhs,leq(A,residualRight(B,W,[0]),[0],[0]));
  }
});
test("source-position bijections cannot be replaced with coincident labels",()=>{
  const a=mk(1,2,[[0,0]],[[0,1]]);
  const b=mk(2,1,[[1,0]],[[0,0]]);
  const out=compose(a,b,[1,0]);
  assert.deepEqual(out.positive,[[0,0]]);
  assert.deepEqual(out.negative,[[0,0]]);
  assert.throws(()=>compose(a,b),/explicit positional bijection/);
  assert.throws(()=>compose(a,b,[0,0]),/explicit positional bijection/);
});
test("positioned relation operations refuse forged cross-carrier coercion",()=>{
  const a=mk(1,1,[[0,0]]);
  const b=mk(2,1,[[1,0]]);
  assert.throws(()=>meet(a,b,[0],[0]),/explicit positional bijection/);
  assert.throws(()=>leq(a,b,[0],[0]),/explicit positional bijection/);
  assert.throws(()=>mk(1,1,[[1,0]]),/original source position/);
});
test("200-by-200 sparse knowledge relation retains useable inference throughput",()=>{
  const n=200,ids=Array.from({length:n},(_,i)=>i);
  const A=mk(n,n,Array.from({length:n-1},(_,i)=>[i,i+1]));
  const start=performance.now();
  const B=compose(A,A,ids),W=residualLeft(A,B,ids);
  assert.equal(leq(compose(A,W,ids),B,ids,ids),true);
  assert.ok(performance.now()-start<5000);
});

test("wire rehydration earns source positional meaning; forged relations are refused",()=>{
  const normal=mk(2,3,[[0,0],[0,2]],[[1,1]]);
  const copy=JSON.parse(JSON.stringify(normal));
  const id=[0,1,2];
  assert.deepEqual(compose(normal,mk(3,1,[[0,0],[2,0]]),id),
                   compose(copy,mk(3,1,[[0,0],[2,0]]),id));
  const forged={...copy,positive:[[0,2],[0,0]]};
  assert.throws(()=>compose(forged,mk(3,1),id),/canonical positional presentation/);
  const impossible={...copy,positive:[[99,0]]};
  assert.throws(()=>compose(impossible,mk(3,1),id),/original source position/);
  const extra={...copy,positive:[[0,0],[0,0],[0,2]]};
  assert.throws(()=>compose(extra,mk(3,1),id),/canonical positional presentation/);
  const accessor=[0,0];
  Object.defineProperty(accessor,0,{get(){throw Error("never read");}});
  assert.throws(()=>mk(1,1,[accessor]),/positional data members/);
});
