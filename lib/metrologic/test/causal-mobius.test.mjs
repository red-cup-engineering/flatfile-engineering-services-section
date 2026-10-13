import test from "node:test";
import assert from "node:assert/strict";
import { mobiusOfFiniteCausalClosure as mu } from
  "../src/articulation/predicating/positing/settling/analysis/causal-mobius.mjs";

const closureFromDAG = (n, edges) => {
  // Independent Floyd-Warshall transitive closure, not the production
  // incidence-algebra recurrence or its predecessor sorting.
  const reaches = Array.from({ length: n }, () => new Array(n).fill(false));
  for (const [a, b] of edges) reaches[a][b] = true;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (reaches[i][k] && reaches[k][j]) reaches[i][j] = true;
  const names = Array.from({length:n},(_,i)=>"v"+i);
  const closure = [];
  for (let a=0;a<n;a++) for(let b=0;b<n;b++)
    if(reaches[a][b]) closure.push({from:names[a],to:names[b]});
  return {names,closure,reaches};
};

const oracleOf = (reaches,a,b,memo=new Map()) => {
  if(a===b)return 1;
  if(!reaches[a][b])return 0;
  const key=a+","+b;
  if(memo.has(key))return memo.get(key);
  let result=0;
  for(let z=0;z<reaches.length;z++)
    if((z===a||reaches[a][z])&&reaches[z][b])
      result+=oracleOf(reaches,a,z,memo);
  memo.set(key,-result);
  return -result;
};

test("finite causal Möbius agrees with an independent recurrence for every forward DAG through five vertices",()=>{
  let graphs=0,pairs=0;
  for(let n=1;n<=5;n++){
    const choices=[];
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)choices.push([i,j]);
    for(let bits=0;bits<2**choices.length;bits++){
      const selected=choices.filter((_,i)=>(bits & (1<<i))!==0);
      const {names,closure,reaches}=closureFromDAG(n,selected);
      graphs++;
      for(let a=0;a<n;a++)for(let b=0;b<n;b++){
        const expected=oracleOf(reaches,a,b);
        assert.equal(mu(names,closure,names[a],names[b]),expected,
          `n=${n}, bits=${bits}, a=${a}, b=${b}`);
        pairs++;
      }
    }
  }
  assert.equal(graphs,1099);
  assert.ok(pairs>26000);
});

test("actual diamond incidence coefficient preserves CHL action signs and orthogonality",()=>{
  const names=["a","b","c","d"];
  const links=[[0,1],[0,2],[1,3],[2,3]];
  const {closure}=closureFromDAG(4,links);
  assert.equal(mu(names,closure,"a","d"),1);
  assert.equal(mu(names,closure,"a","b"),-1);
  assert.equal(mu(names,closure,"a","c"),-1);
  assert.equal(mu(names,closure,"a","a"),1);
  assert.equal(mu(names,closure,"b","a"),0);
  assert.equal(["a","b","c","d"].reduce((s,ending)=>s+mu(names,closure,"a",ending),0),0);
});

test("long total causal chains run iteratively and do not enumerate exponential subchains",()=>{
  const n=320;
  const names=Array.from({length:n},(_,i)=>"chain-"+i);
  const closure=[];
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
    closure.push({from:names[i],to:names[j]});
  assert.equal(mu(names,closure,names[0],names[1]),-1);
  assert.equal(mu(names,closure,names[0],names[n-1]),0);
  assert.equal(mu(names,closure,names[n-2],names[n-1]),-1);
  assert.equal(mu(names,closure,names[n-1],names[n-1]),1);
});

test("wide layered causal orders are computed exactly and refuse unsafe numeric output",()=>{
  const width=3,layers=55;
  const names=["start"];
  for(let level=0;level<layers;level++)
    for(let i=0;i<width;i++)names.push("L"+level+"-"+i);
  names.push("end");
  const levels=names.map(name=>name==="start"?-1:name==="end"?layers:
    Number(name.slice(1,name.indexOf("-"))));
  const closure=[];
  for(let i=0;i<names.length;i++)for(let j=0;j<names.length;j++)
    if(levels[i]<levels[j])closure.push({from:names[i],to:names[j]});
  assert.equal(mu(names,closure,"start","L0-0"),-1);
  assert.throws(()=>mu(names,closure,"start","end"),/exact safe integer/);
});

test("unknown, repeated, cyclic self-link and malformed carrier events refuse",()=>{
  assert.throws(()=>mu(["a","a"],[],"a","a"),/distinct/);
  assert.throws(()=>mu(["a"],[{from:"a",to:"a"}],"a","a"),/strict relation/);
  assert.throws(()=>mu(["a"],[{from:"a",to:"other"}],"a","a"),/strict relation/);
  assert.throws(()=>mu(["a"],[],"a","missing"),/endpoint/);
  assert.throws(()=>mu([null],[],null,null),/distinct/);
  assert.throws(()=>mu([],{},null,null),/closure/);
});
