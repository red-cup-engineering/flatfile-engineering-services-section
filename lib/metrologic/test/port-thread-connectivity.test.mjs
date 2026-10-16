import test from 'node:test';
import assert from 'node:assert/strict';
import {
  portThreadRouteOf, minimumPortThreadRouteOf,
  closedPortThreadFeasibilityOf, coveringPortThreadRouteOf,
} from '../src/articulation/predicating/positing/settling/analysis/port-thread-routing.mjs';

const bead=id=>({id,holes:[['-','+']]});
const port=(beadId,port)=>({beadId,port});
const link=(from,to,exit='+',enter='-')=>
  ({from:port(from,exit),to:port(to,enter)});
const receipt=(model,route)=>portThreadRouteOf({
  ...model,passes:route.thread.map(({beadId,enter,exit})=>({beadId,enter,exit})),
  closed:true,requireEveryBead:true,
});

/** Independent raw-link route-word oracle, not SCC or the provider's BFS. */
const oracle=(beads,links)=>{
  const ids=beads.map(b=>b.id);
  const admitted=new Set(links.map(l=>JSON.stringify([l.from.beadId,l.to.beadId])));
  const edge=(a,b)=>admitted.has(JSON.stringify([a,b]));
  let words=ids.map(id=>[id]);
  for(let depth=1;depth<=8;depth++){
    for(const word of words)
      if(new Set(word).size===ids.length&&edge(word.at(-1),word[0]))
        return depth;
    words=words.flatMap(w=>ids.filter(next=>edge(w.at(-1),next))
      .map(next=>[...w,next]));
  }
  return null;
};

test('every three-bead directed connector graph agrees with independent closed-word enumeration',()=>{
  const ids=['a','b','c'],beads=ids.map(bead);
  const possible=ids.flatMap(a=>ids.filter(b=>a!==b).map(b=>link(a,b)));
  let yes=0,no=0;
  for(let mask=0;mask<2**possible.length;mask++){
    const links=possible.filter((_,i)=>(mask&(1<<i))!==0);
    const model={beads,links};
    const shortest=oracle(beads,links);
    const feasibility=closedPortThreadFeasibilityOf(model);
    const built=coveringPortThreadRouteOf(model);
    assert.equal(feasibility.feasible,shortest!==null,'graph='+mask);
    if(shortest===null){
      no++;
      assert.equal(feasibility.reason,'no-covering-cyclic-component');
      assert.equal(built.kind,'aperiodic.portGraph.threadRoute-obstruction');
      assert.equal(built.feasibility.feasible,false);
    }else{
      yes++;
      assert.equal(built.kind,'aperiodic.portGraph.threadRoute:witness');
      assert.ok(built.passCount>=shortest,'constructed witness cannot beat exact oracle');
      assert.equal(receipt(model,built).kind,'aperiodic.portGraph.threadRoute:witness');
      assert.equal(built.feasibility.feasible,true);
    }
  }
  assert.equal(yes,18);
  assert.equal(no,46);
});

test('a 1500-bead directed closed ring has a constructive port walk beyond exact-search limits',()=>{
  const size=1500;
  const beads=Array.from({length:size},(_,i)=>bead('b'+i));
  const links=Array.from({length:size},(_,i)=>
    link('b'+i,'b'+((i+1)%size)));
  const model={beads,links};
  const f=closedPortThreadFeasibilityOf(model);
  assert.equal(f.feasible,true);
  assert.equal(f.orientedPassCount,2*size);
  assert.equal(f.maxCyclicBeadsCovered,size);
  assert.equal(f.coveringPassIndices.length,size);
  const actual=coveringPortThreadRouteOf(model);
  assert.equal(actual.kind,'aperiodic.portGraph.threadRoute:witness');
  assert.equal(actual.passCount,size);
  assert.equal(actual.threadSegments.length,size);
  assert.ok(actual.examinedConnectorTransitions<3*size);
  assert.deepEqual(actual.locallyOverOccupied,[]);
  assert.equal(receipt(model,actual).kind,'aperiodic.portGraph.threadRoute:witness');
  assert.throws(()=>minimumPortThreadRouteOf(model),/bounded to 9 beads/);
});

test('acyclic connections and disjoint cyclic components give explicit obstructions',()=>{
  const beads=['a','b','c','d'].map(bead);
  const acyclic={beads,links:[link('a','b'),link('b','c'),link('c','d')]};
  const no=closedPortThreadFeasibilityOf(acyclic);
  assert.equal(no.feasible,false);
  assert.equal(no.cyclicComponentCount,0);
  assert.equal(no.maxCyclicBeadsCovered,0);
  assert.deepEqual(no.uncoveredFromLargestCyclicComponent,['a','b','c','d']);
  assert.equal(coveringPortThreadRouteOf(acyclic).reason,'no-covering-cyclic-component');
  const halves={beads,links:[
    link('a','b'),link('b','a'),link('c','d'),link('d','c'),
  ]};
  const cut=closedPortThreadFeasibilityOf(halves);
  assert.equal(cut.feasible,false);
  assert.equal(cut.maxCyclicBeadsCovered,2);
  assert.ok(cut.componentCoverages.filter(x=>x.cyclic).length>=2);
  assert.equal(coveringPortThreadRouteOf(halves).reason,'no-covering-cyclic-component');
});

test('a single bead can require a TWO-PASS closed circuit of opposite hole directions',()=>{
  const beads=[bead('a')],links=[
    link('a','a','+','+'),
    link('a','a','-','-'),
  ];
  const model={beads,links};
  const f=closedPortThreadFeasibilityOf(model);
  assert.equal(f.feasible,true);
  assert.equal(f.coveringPassIndices.length,2);
  const route=coveringPortThreadRouteOf(model);
  assert.equal(route.kind,'aperiodic.portGraph.threadRoute:witness');
  assert.equal(route.passCount,2);
  assert.equal(route.occupations[0].count,2);
  assert.equal(route.occupations[0].charge,'stable');
  assert.equal(receipt(model,route).kind,'aperiodic.portGraph.threadRoute:witness');
  assert.equal(closedPortThreadFeasibilityOf({beads,links:[]}).feasible,false);
  const one={beads,links:[link('a','a')]};
  assert.equal(coveringPortThreadRouteOf(one).passCount,1);
});

test('multi-hole covering route preserves local per-hole and per-bead occupations',()=>{
  const beads=[
    {id:'a',holes:[['west','east'],['north','south']]},
    {id:'b',holes:[['p','q']]},
    {id:'c',holes:[['x','y']]},
  ];
  const links=[
    {from:port('a','east'),to:port('b','p')},
    {from:port('b','q'),to:port('a','north')},
    {from:port('a','south'),to:port('c','x')},
    {from:port('c','y'),to:port('a','west')},
  ];
  const model={beads,links};
  const f=closedPortThreadFeasibilityOf(model);
  assert.equal(f.feasible,true);
  const result=coveringPortThreadRouteOf(model);
  assert.equal(result.kind,'aperiodic.portGraph.threadRoute:witness');
  assert.equal(result.passCount,4);
  assert.equal(result.occupations[0].count,2);
  assert.deepEqual(result.occupations[0].holes.map(x=>x.count),[1,1]);
  assert.equal(result.occupations[0].charge,'stable');
  assert.deepEqual(result.occupations[0].holes.map(x=>x.charge),['potential','potential']);
  assert.deepEqual(result.locallyOverOccupied,['a']);
  assert.equal(receipt(model,result).kind,'aperiodic.portGraph.threadRoute:witness');
});

test('a strict K(C) sequencing fragment alone cannot supply physical closed connectors',()=>{
  const model={beads:['01','02','12'].map(bead),links:[link('01','12')]};
  assert.equal(closedPortThreadFeasibilityOf(model).feasible,false);
  assert.equal(coveringPortThreadRouteOf(model).kind,
    'aperiodic.portGraph.threadRoute-obstruction');
  const empty=closedPortThreadFeasibilityOf({beads:[],links:[]});
  assert.equal(empty.feasible,false);
  assert.equal(empty.reason,'empty-closed-route');
  assert.throws(()=>closedPortThreadFeasibilityOf({
    beads:[bead('a')],links:[link('a','missing')],
  }),/absent bead port/);
});

test('branching material route revisits its hub, unlike an acyclic causality strand cover',()=>{
  const model={beads:['a','b','c','d'].map(bead),links:[
    link('a','b'),link('b','a'),link('a','c'),link('c','a'),
    link('a','d'),link('d','a'),
  ]};
  const f=closedPortThreadFeasibilityOf(model);
  assert.equal(f.feasible,true);
  const r=coveringPortThreadRouteOf(model);
  assert.equal(r.kind,'aperiodic.portGraph.threadRoute:witness');
  assert.equal(r.passCount,6);
  assert.deepEqual(r.occupations.map(x=>x.count),[3,1,1,1]);
  assert.deepEqual(r.locallyOverOccupied,['a']);
  assert.equal(receipt(model,r).kind,'aperiodic.portGraph.threadRoute:witness');
});


test('independent Floyd-Warshall checks 256 mixed-orientation connector graphs',()=>{
 const beads=[bead('a'),bead('b')];
 const possible=[
   link('a','b','+','-'),link('b','a','+','-'),
   link('a','b','-','+'),link('b','a','-','+'),
   link('a','a','+','+'),link('a','a','-','-'),
   link('b','b','+','+'),link('b','b','-','-'),
 ];
 const states=beads.flatMap(b=>[
   {beadId:b.id,enter:'-',exit:'+'},
   {beadId:b.id,enter:'+',exit:'-'},
 ]);
 let feasibleCount=0,impossibleCount=0;
 for(let mask=0;mask<2**possible.length;mask++){
   const links=possible.filter((_,i)=>(mask&(1<<i))!==0);
   const reaches=Array.from({length:states.length},()=>
     Array(states.length).fill(false));
   // Deliberately derive the relation from raw ports, not the provider's SCC.
   for(const l of links)for(let i=0;i<states.length;i++)
     for(let j=0;j<states.length;j++)
       if(states[i].beadId===l.from.beadId&&states[i].exit===l.from.port&&
          states[j].beadId===l.to.beadId&&states[j].enter===l.to.port)
         reaches[i][j]=true;
   for(let k=0;k<states.length;k++)for(let i=0;i<states.length;i++)
     for(let j=0;j<states.length;j++)
       if(reaches[i][k]&&reaches[k][j])reaches[i][j]=true;
   const oracle=states.some((_,i)=>{
     if(!reaches[i][i])return false;
     const sameScc=states.filter((__,j)=>reaches[i][j]&&reaches[j][i]);
     return new Set(sameScc.map(s=>s.beadId)).size===2;
   });
   const model={beads,links};
   const actual=closedPortThreadFeasibilityOf(model);
   assert.equal(actual.feasible,oracle,'mask='+mask);
   const word=coveringPortThreadRouteOf(model);
   if(oracle){
     feasibleCount++;
     assert.equal(word.kind,'aperiodic.portGraph.threadRoute:witness');
     assert.equal(receipt(model,word).kind,'aperiodic.portGraph.threadRoute:witness');
   }else{
     impossibleCount++;
     assert.equal(word.kind,'aperiodic.portGraph.threadRoute-obstruction');
   }
 }
 assert.equal(feasibleCount+impossibleCount,256);
 assert.ok(feasibleCount>0&&impossibleCount>0);
});
