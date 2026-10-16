import test from 'node:test';
import assert from 'node:assert/strict';
import { portThreadRouteOf, minimumPortThreadRouteOf } from '../src/articulation/predicating/positing/settling/analysis/port-thread-routing.mjs';

const bead = id => ({ id, holes: [['-', '+']] });
const link = (from, to) => ({from:{beadId:from,port:'+'},to:{beadId:to,port:'-'}});
const pass = beadId => ({beadId,enter:'-',exit:'+'});
const ring = {
 beads:['a','b','c'].map(bead),
 links:[link('a','b'),link('b','c'),link('c','a')],
 passes:['a','b','c'].map(pass),closed:true,requireEveryBead:true,
};

test('three-bead ring is one closed thread, three local single occupations, no local condensate',()=>{
 const r=portThreadRouteOf(ring);
 assert.equal(r.kind,'aperiodic.portGraph.threadRoute:witness');
 assert.equal(r.passCount,3);
 assert.equal(r.threadSegments.length,3);
 assert.equal(r.closed,true);
 assert.deepEqual(r.locallyOverOccupied,[]);
 assert.deepEqual(r.occupations.map(x=>x.count),[1,1,1]);
 assert.deepEqual(r.occupations.map(x=>x.charge),['potential','potential','potential']);
 assert.equal(r.globalPassCharge,'stable');
 assert.ok(Object.isFrozen(r.thread)&&Object.isFrozen(r.occupations));
});

test('minimum closed ring is three visits, with a separate independently checked witness',()=>{
 const optimal=minimumPortThreadRouteOf(ring);
 assert.equal(optimal.kind,'aperiodic.portGraph.threadRoute:witness');
 assert.equal(optimal.minimalPassCount,3);
 assert.equal(optimal.threadSegments.length,3);
 assert.deepEqual(optimal.locallyOverOccupied,[]);
 const verified=portThreadRouteOf({...ring,passes:optimal.thread.map(p=>({beadId:p.beadId,enter:p.enter,exit:p.exit}))});
 assert.equal(verified.kind,'aperiodic.portGraph.threadRoute:witness');
 assert.equal(verified.passCount,3);
});

test('branching route requires a REPEATED bead visit, which carries local held-both charge',()=>{
 const branching={
  beads:['a','b','c'].map(bead),
  links:[link('a','b'),link('b','a'),link('a','c'),link('c','a')],
  passes:['a','b','a','c'].map(pass), closed:true,requireEveryBead:true,
 };
 const r=portThreadRouteOf(branching);
 assert.equal(r.kind,'aperiodic.portGraph.threadRoute:witness');
 assert.deepEqual(r.occupations.map(x=>x.count),[2,1,1]);
 assert.deepEqual(r.locallyOverOccupied,['a']);
 assert.deepEqual(r.occupations.map(x=>x.charge),['stable','potential','potential']);
 assert.equal(r.occupations[0].holes[0].count,2);
 const optimal=minimumPortThreadRouteOf(branching);
 assert.equal(optimal.minimalPassCount,4,'cannot visit b and c in a 3-pass closed tour');
 assert.equal(optimal.locallyOverOccupied.length,1);
 assert.equal(optimal.locallyOverOccupied[0],'a');
});

test('rejects unsupported internal turn, missing external connector, and false closure',()=>{
 assert.equal(portThreadRouteOf({...ring,passes:[{beadId:'a',enter:'-',exit:'-'}]}).reason,'unlisted-hole-transition');
 assert.equal(portThreadRouteOf({...ring,links:ring.links.slice(1)}).reason,'unlisted-external-connector');
 assert.equal(portThreadRouteOf({...ring,closed:true,passes:[]}).reason,'empty-closed-route');
 assert.equal(portThreadRouteOf({...ring,passes:[pass('a')],requireEveryBead:false}).reason,'unlisted-external-connector');
 assert.equal(portThreadRouteOf({...ring,passes:[pass('a')],closed:false}).kind,'aperiodic.portGraph.threadRoute-obstruction');
 assert.throws(()=>portThreadRouteOf({...ring,passes:[pass('missing')]}),/absent bead/);
 assert.throws(()=>portThreadRouteOf({...ring,passes:[pass('a')],closed:'yes'}),/explicit booleans/);
});

test('multi-hole beads use only enumerated port pairs, never guessed ports',()=>{
 const source={
  beads:[{id:'a',holes:[['west','east'],['north','south']]},{id:'b',holes:[['p','q']]}],
  links:[{from:{beadId:'a',port:'east'},to:{beadId:'b',port:'p'}},
         {from:{beadId:'b',port:'q'},to:{beadId:'a',port:'north'}}],
  passes:[{beadId:'a',enter:'west',exit:'east'}, {beadId:'b',enter:'p',exit:'q'},
          {beadId:'a',enter:'north',exit:'south'}],
  closed:false,requireEveryBead:true,
 };
 const observed=portThreadRouteOf(source);
 assert.equal(observed.kind,'aperiodic.portGraph.threadRoute:witness');
 assert.deepEqual(observed.occupations[0].holes.map(x=>x.count),[1,1]);
 assert.equal(observed.occupations[0].count,2);
 assert.deepEqual(observed.locallyOverOccupied,['a']);
 assert.equal(portThreadRouteOf({...source,passes:[{beadId:'a',enter:'west',exit:'south'}]}).reason,'unlisted-hole-transition');
 assert.throws(()=>portThreadRouteOf({...source,beads:[{id:'a',holes:[['west','east'],['west','south']]}]}),/distinct mouths/);
});

test('pure causal K(C) sequencing cannot be a nonempty CLOSED physical thread carrier',()=>{
 const k={beads:['01','02','12'].map(bead),links:[link('01','12')]};
 const closed=minimumPortThreadRouteOf({...k,closed:true});
 assert.equal(closed.kind,'aperiodic.portGraph.threadRoute-obstruction');
 assert.equal(closed.reason,'no-closed-thread-route');
 const open=minimumPortThreadRouteOf({...k,closed:false});
 assert.equal(open.reason,'no-covering-thread-route');
 assert.equal(portThreadRouteOf({...k,passes:[pass('01'),pass('12')],closed:false,requireEveryBead:false}).kind,
   'aperiodic.portGraph.threadRoute:witness');
});

test('finite search refuses over-budget carriers rather than returning a fake no-route conclusion',()=>{
 const beads=Array.from({length:10},(_,i)=>bead(String(i)));
 assert.throws(()=>minimumPortThreadRouteOf({beads,links:[]}),/bounded to 9 beads/);
 assert.throws(()=>portThreadRouteOf({beads:[bead('a'),bead('a')],links:[],passes:[],closed:false,requireEveryBead:true}),/duplicate bead/);
 assert.throws(()=>portThreadRouteOf({beads:[{id:'a',holes:[['p','p']]}],links:[],passes:[],closed:false,requireEveryBead:true}),/different/);
 const res=minimumPortThreadRouteOf({beads:[],links:[],closed:false});
 assert.equal(res.passCount,0);
});

const bruteMinimum=(beads,links,closed)=>{
 const names=beads.map(x=>x.id);
 const edges=new Set(links.map(x=>x.from.beadId+'=>'+x.to.beadId));
 const admissible=word=>{
  if(new Set(word).size!==names.length)return false;
  for(let i=1;i<word.length;i++)if(!edges.has(word[i-1]+'=>'+word[i]))return false;
  return !closed || edges.has(word.at(-1)+'=>'+word[0]);
 };
 let words=names.map(n=>[n]);
 for(let depth=1;depth<=8;depth++){
  for(const word of words)if(admissible(word))return depth;
  words=words.flatMap(w=>names.filter(n=>edges.has(w.at(-1)+'=>'+n)).map(n=>[...w,n]));
 }
 return null;
};
test('all 3-bead directed graphs agree with independent route-word enumeration',()=>{
 const names=['a','b','c'],beads=names.map(bead);
 const potential=names.flatMap(a=>names.filter(b=>a!==b).map(b=>link(a,b)));
 let checked=0,admitted=0,refused=0;
 for(let mask=0;mask<2**potential.length;mask++){
  const links=potential.filter((_,i)=>mask&(1<<i));
  for(const closed of [true,false]){
   const expected=bruteMinimum(beads,links,closed);
   const got=minimumPortThreadRouteOf({beads,links,closed});
   if(expected===null){
    assert.equal(got.kind,'aperiodic.portGraph.threadRoute-obstruction');refused++;
   }else{
    assert.equal(got.minimalPassCount,expected,`graph ${mask}, closed=${closed}`);
    admitted++;
   }
   checked++;
  }
 }
 assert.equal(checked,128);
 assert.ok(admitted>0&&refused>0);
});
