import test from "node:test";
import assert from "node:assert/strict";
import {
  materialPortThreadRouteOf, minimumMaterialPortThreadRouteOf,
  materialPortThreadOptimalityAdmits, minimumPortThreadRouteOf, portThreadRouteOf,
} from "../src/articulation/predicating/positing/settling/analysis/port-thread-routing.mjs";

const bead=(id,cost=1)=>({id,holes:[["-","+"]],holeLengthsUm:[cost]});
const link=(a,b,cost)=>({
  from:{beadId:a,port:"+"},to:{beadId:b,port:"-"},lengthUm:cost,
});
const underlined=(model,route)=>materialPortThreadRouteOf({
  ...model,passes:route.thread.map(({beadId,enter,exit})=>({beadId,enter,exit})),
  closed:route.closed,requireEveryBead:true,
});

/**
 * Independent actual-word enumeration. This oracle does NOT use a mask state,
 * Dijkstra, the provider's port-state graph, or a matching algorithm.
 * All tested one-hole links go from + to -, so a valid multi-pass path has
 * one fixed oriented pass at every bead.
 */
function bruteCost(beads,links,closed){
  const costs=new Map(links.map(x=>[
    JSON.stringify([x.from.beadId,x.to.beadId]),BigInt(x.lengthUm),
  ]));
  const hole=new Map(beads.map(b=>[b.id,BigInt(b.holeLengthsUm[0])]));
  const names=beads.map(b=>b.id);
  const visitedAll=word=>new Set(word).size===names.length;
  let frontier=names.map(id=>({word:[id],cost:hole.get(id)}));
  let best=null;
  // For <=3 beads, any feasible covering walk can use at most 8 passes:
  // in an SCC, connecting representatives needs at most 2 steps per leg.
  for(let depth=1;depth<=8;depth++){
    const next=[];
    for(const state of frontier) {
      const {word,cost}=state,first=word[0],last=word.at(-1);
      if(visitedAll(word)) {
        const closing=closed?costs.get(JSON.stringify([last,first])):0n;
        if(closing!==undefined) {
          const total=cost+closing;
          if(best===null||total<best)best=total;
        }
      }
      if(depth===8)continue;
      for(const b of names) {
        const connector=costs.get(JSON.stringify([last,b]));
        if(connector===undefined)continue;
        const total=cost+connector+hole.get(b);
        if(best!==null&&total>=best)continue;
        next.push({word:[...word,b],cost:total});
      }
    }
    frontier=next;
  }
  return best;
}

test("fewer passes can consume MORE cord: shortest-cost four-pass route defeats three-pass route",()=>{
 const model={
   beads:["a","b","c"].map(id=>bead(id)),
   links:[
     link("a","b",1),link("b","a",1),
     link("a","c",1),link("c","a",1),
     link("b","c",100),link("c","b",100),
   ],closed:true,
 };
 const bare=minimumPortThreadRouteOf(model);
 const optimized=minimumMaterialPortThreadRouteOf(model);
 assert.equal(bare.minimalPassCount,3);
 assert.equal(optimized.passCount,4);
 assert.equal(optimized.totalLengthUm,"8");
 assert.equal(optimized.minimalTotalLengthUm,"8");
 assert.equal(optimized.holeLengthUm,"4");
 assert.equal(optimized.connectorLengthUm,"4");
 assert.equal(optimized.lengthUnit,"um");
 assert.equal(optimized.lengthsCalibrated,false);
 assert.equal(optimized.minimalBy,"exact nonnegative integer micrometre Dijkstra");
 assert.equal(underlined(model,optimized).totalLengthUm,"8");
 assert.equal(bruteCost(model.beads,model.links,true),8n);
});

test("all 64 three-bead directed port graphs and open/closed objectives equal independent word minima",()=>{
 const ids=["a","b","c"],beads=ids.map((id,i)=>bead(id,[2,7,3][i]));
 const potential=ids.flatMap(a=>ids.filter(b=>b!==a)
   .map((b,i)=>link(a,b,1+((ids.indexOf(a)*4+i)*7)%31)));
 let compared=0,possible=0,impossible=0;
 for(let mask=0;mask<2**potential.length;mask++){
   const links=potential.filter((_,i)=>mask&(1<<i));
   for(const closed of [true,false]){
     const model={beads,links,closed};
     const expected=bruteCost(beads,links,closed);
     const observed=minimumMaterialPortThreadRouteOf({
       ...model,includeOptimalityCertificate:true,
     });
     if(expected===null){
       impossible++;
       assert.equal(observed.kind,"aperiodic.portGraph.threadRoute-obstruction");
     }else{
       possible++;
       assert.equal(observed.kind,"aperiodic.portGraph.materialThreadRoute:witness");
       assert.equal(observed.minimalTotalLengthUm,String(expected),
         "mask="+mask+" closed="+closed);
       assert.equal(observed.optimalityAdmission.admitted,true);
       assert.equal(observed.optimalityAdmission.lowerBoundUm,String(expected));
       assert.equal(observed.optimalityAdmission.upperBoundUm,String(expected));
       const reread=underlined(model,observed);
       assert.equal(reread.totalLengthUm,String(expected));
       assert.equal(reread.holePassLengthsUm.length,observed.passCount);
       assert.equal(reread.connectorSegmentLengthsUm.length,
         observed.passCount-(closed?0:1));
     }
     compared++;
   }
 }
 assert.equal(compared,128);
 assert.ok(possible>0&&impossible>0);
});

test("independent receipt counts every repeated hole and connector and exact loop closure",()=>{
 const model={
   beads:["a","b","c"].map((id,i)=>bead(id,i+1)),
   links:[link("a","b",7),link("b","a",3),link("a","c",5),link("c","a",2)],
   closed:true,requireEveryBead:true,
   passes:["a","b","a","c"].map(beadId=>({beadId,enter:"-",exit:"+"})),
 };
 const r=materialPortThreadRouteOf(model);
 assert.equal(r.kind,"aperiodic.portGraph.materialThreadRoute:witness");
 assert.equal(r.passCount,4);
 assert.equal(r.holeLengthUm,"7");
 assert.equal(r.connectorLengthUm,"17");
 assert.equal(r.totalLengthUm,"24");
 assert.deepEqual(r.holePassLengthsUm,["1","2","1","3"]);
 assert.deepEqual(r.connectorSegmentLengthsUm,["7","3","5","2"]);
 assert.deepEqual(r.occupations.map(v=>v.count),[2,1,1]);
 assert.equal(r.occupations[0].charge,"stable");
 assert.ok(Object.isFrozen(r.thread));
});

test("multi-hole costs choose the cheaper real passage, not an invented shortcut",()=>{
 const a={id:"a",holes:[["west","east"],["south","north"]],
   holeLengthsUm:[100,2]};
 const b={id:"b",holes:[["p","q"]],holeLengthsUm:[3]};
 const p=(beadId,port)=>({beadId,port});
 const model={beads:[a,b],links:[
   {from:p("a","east"),to:p("b","p"),lengthUm:1},
   {from:p("b","q"),to:p("a","west"),lengthUm:1},
   {from:p("a","north"),to:p("b","p"),lengthUm:1},
   {from:p("b","q"),to:p("a","south"),lengthUm:1},
 ]};
 const r=minimumMaterialPortThreadRouteOf(model);
 assert.equal(r.kind,"aperiodic.portGraph.materialThreadRoute:witness");
 assert.equal(r.totalLengthUm,"7"); // hole 2+3; connectors 1+1
 assert.equal(r.passCount,2);
 assert.equal(r.thread.find(p=>p.beadId==="a").holeIndex,1);
 assert.equal(underlined({...model,closed:true},r).totalLengthUm,"7");
});

test("large exact integer thread totals do not round or overflow binary64",()=>{
 const huge=Number.MAX_SAFE_INTEGER;
 const model={beads:["a","b","c"].map(id=>bead(id)),
   links:[link("a","b",huge),link("b","c",huge),link("c","a",huge)]};
 const r=minimumMaterialPortThreadRouteOf(model);
 const trueTotal=3n*BigInt(huge)+3n;
 assert.equal(r.minimalTotalLengthUm,String(trueTotal));
 assert.equal(r.connectorLengthUm,String(3n*BigInt(huge)));
 assert.equal(underlined({...model,closed:true},r).totalLengthUm,String(trueTotal));
});

test("material length is never fabricated, and bad costs fail closed",()=>{
 const beads=[bead("a"),bead("b")];
 const links=[link("a","b",1),link("b","a",2)];
 const f=(spec)=>minimumMaterialPortThreadRouteOf(spec);
 assert.throws(()=>f({beads,links:[{from:links[0].from,to:links[0].to},links[1]]}),
   /explicit nonnegative/);
 assert.throws(()=>f({beads:[{id:"a",holes:[["-","+"]] },beads[1]],links}),
   /holeLengthsUm/);
 assert.throws(()=>f({beads:[{...beads[0],holeLengthsUm:[0]},beads[1]],links}),
   /explicit positive/);
 assert.throws(()=>f({beads,links:[{...links[0],lengthUm:-1},links[1]]}),
   /explicit nonnegative/);
 assert.throws(()=>f({beads,links:[{...links[0],lengthUm:1.5},links[1]]}),
   /explicit nonnegative/);
 assert.throws(()=>f({beads,links:[{...links[0],lengthUm:Number.MAX_SAFE_INTEGER+1},links[1]]}),
   /explicit nonnegative/);
 assert.throws(()=>f({beads,links,closed:"true"}),/closed must be a boolean/);
 const absent=f({beads,links:[links[0]]});
 assert.equal(absent.kind,"aperiodic.portGraph.threadRoute-obstruction");
 assert.equal(absent.reason,"no-closed-thread-route");
});

test("empty open material route is zero, empty closed route is an obstruction",()=>{
 const open=minimumMaterialPortThreadRouteOf({beads:[],links:[],closed:false});
 assert.equal(open.totalLengthUm,"0");
 assert.equal(open.passCount,0);
 const closed=minimumMaterialPortThreadRouteOf({beads:[],links:[],closed:true});
 assert.equal(closed.reason,"empty-closed-route");
});

test("finite kinetic optimum carries an independent lower-bound closure witness",()=>{
 const model={
  beads:["a","b","c"].map(id=>bead(id)),
  links:[link("a","b",1),link("b","a",1),link("a","c",1),
    link("c","a",1),link("b","c",100),link("c","b",100)],
  closed:true,
 };
 const admitted=minimumMaterialPortThreadRouteOf({
   ...model,includeOptimalityCertificate:true,
 });
 assert.equal(admitted.kind,"aperiodic.portGraph.materialThreadRoute:witness");
 assert.equal(admitted.totalLengthUm,"8");
 assert.equal(admitted.optimalityAdmission.admitted,true);
 assert.equal(admitted.optimalityAdmission.lowerBoundUm,"8");
 assert.equal(admitted.optimalityAdmission.upperBoundUm,"8");
 assert.ok(admitted.optimalityCertificate.states.length>=1);
 const route={...model,requireEveryBead:true,passes:admitted.thread.map(
   ({beadId,enter,exit})=>({beadId,enter,exit}))};
 const check=materialPortThreadOptimalityAdmits(route,admitted.optimalityCertificate);
 assert.equal(check.admitted,true);
 assert.equal(check.checkedStates,admitted.optimalityCertificate.states.length);
 assert.ok(Object.isFrozen(admitted.optimalityCertificate.states));
 const missing={...admitted.optimalityCertificate,
   states:admitted.optimalityCertificate.states.slice(1)};
 assert.equal(materialPortThreadOptimalityAdmits(route,missing).admitted,false,
   "deleting a lower-cost source state breaks the closed frontier proof");
 const repeat={...admitted.optimalityCertificate,
   states:[...admitted.optimalityCertificate.states,
     admitted.optimalityCertificate.states[0]]};
 assert.equal(materialPortThreadOptimalityAdmits(route,repeat).reason,
   "invalid-bound-or-duplicate");
 const mismatched={...admitted.optimalityCertificate,thresholdUm:"9"};
 assert.equal(materialPortThreadOptimalityAdmits(route,mismatched).reason,
   "primal-dual-gap");
 const invalid={...admitted.optimalityCertificate,thresholdUm:"08"};
 assert.equal(materialPortThreadOptimalityAdmits(route,invalid).reason,
   "malformed-certificate");
 const cheap={...admitted.optimalityCertificate,states:[]};
 assert.equal(materialPortThreadOptimalityAdmits(route,cheap).reason,
   "missing-or-too-high-seed");
});

test("false pass-count optimum fails kinetic lower-bound admission even if word is legal",()=>{
 const model={
  beads:["a","b","c"].map(id=>bead(id)),
  links:[link("a","b",1),link("b","a",1),link("a","c",1),
    link("c","a",1),link("b","c",100),link("c","b",100)],
  closed:true,
 };
 const optimal=minimumMaterialPortThreadRouteOf({
  ...model,includeOptimalityCertificate:true,
 });
 const badWord=minimumPortThreadRouteOf(model);
 assert.equal(badWord.passCount,3);
 const badRoute={...model,requireEveryBead:true,
   passes:badWord.thread.map(({beadId,enter,exit})=>({beadId,enter,exit}))};
 assert.equal(materialPortThreadRouteOf(badRoute).totalLengthUm,"105");
 assert.equal(materialPortThreadOptimalityAdmits(badRoute,
   optimal.optimalityCertificate).reason,"primal-dual-gap");
 // Even making its cost the claimed threshold cannot hide the cheaper path.
 const attempted={...optimal.optimalityCertificate,thresholdUm:"105"};
 assert.equal(materialPortThreadOptimalityAdmits(badRoute,attempted).admitted,
   false);
});

test("zero open length and externally uncalibrated large integer receipts certify exactly",()=>{
 const empty=minimumMaterialPortThreadRouteOf({
  beads:[],links:[],closed:false,includeOptimalityCertificate:true,
 });
 assert.equal(empty.totalLengthUm,"0");
 assert.equal(empty.optimalityAdmission.admitted,true);
 assert.deepEqual(empty.optimalityCertificate.states,[]);
 const max=Number.MAX_SAFE_INTEGER;
 const model={beads:["a","b","c"].map(id=>bead(id)),
   links:[link("a","b",max),link("b","c",max),link("c","a",max)],
   closed:true,includeOptimalityCertificate:true};
 const r=minimumMaterialPortThreadRouteOf(model);
 assert.equal(r.totalLengthUm,String(3n*BigInt(max)+3n));
 assert.equal(r.optimalityAdmission.admitted,true);
 assert.equal(r.optimalityAdmission.lowerBoundUm,r.totalLengthUm);
 assert.equal(r.lengthsCalibrated,false);
 assert.throws(()=>minimumMaterialPortThreadRouteOf({
   ...model,includeOptimalityCertificate:"yes",
 }),/must be boolean/);
});
