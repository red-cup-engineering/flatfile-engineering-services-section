/**
 * Finite capacity flow: an exact, directed, bounded witness to movable work.
 *
 * The upstream metrological claim is an oriented chain: each admitted link
 * moves an amount of ONE grade from tail to head, and ∂f at every interior
 * vertex must vanish. The maximum flow/minimum cut equality is calculated
 * and independently checked, never merely declared.
 *
 * This is the DISCRETE analogue of pressure-driven transport, not a
 * Navier–Stokes solution, CFD forecast, Klein gauge law, service permission,
 * market-demand observation, cloud quota reservation or actual execution.
 * The caller admits each arc's operational/legal feasibility and the grade;
 * arbitrary relabelling of vertices cannot change the maximum throughput.
 *
 * The Group's FOUR/Klein gauge acts on evidence readings, not on permission:
 * no gauge transformation can make an unauthorized provider eligible.
 *
 * Counts remain arbitrary-precision ℕ in canonical decimal strings, like
 * the existing Obsmetrologia/exact-number carriers; no float coercions.
 */
const NAT=/^(?:0|[1-9][0-9]{0,39})$/u;
const fail=message=>{throw new TypeError('conserved capacity flow: '+message)};
const idOf=(v,label)=>{
 if(typeof v!=='string'||!v||v.length>160||/\s/u.test(v))
  fail(label+' must be a bounded distinct named vertex/link');
 return v;
};
const amountOf=(v,label)=>{
 if(typeof v!=='string'||!NAT.test(v))
  fail(label+' requires exact unsigned canonical natural decimal string');
 return BigInt(v);
};
const freeze=v=>Object.freeze(v);

/**
 * Maximise the conserved flow of exactly ONE declared unit/grade.
 * \`nodes\` are canonical vertex names; \`links\` are directed and content
 * supplied by the caller. Repeated links between the same vertices are legal
 * when each has its own witness identity. No edge is inferred from proximity,
 * a market listing, or a mathematical gauge.
 *
 * Dinic residual augmentations are bounded in memory by nodes and links;
 * their exact-flow witness obeys each link limit and every interior balance.
 */
export function solveConservedCapacityFlow({unit,nodes,source,sink,links}={}){
 idOf(unit,'measurement unit');
 if(!Array.isArray(nodes)||nodes.length<2||nodes.length>512)
  fail('2..512 named vertices required');
 if(!Array.isArray(links)||links.length>8192)
  fail('at most 8192 source-qualified directed links allowed');
 const vertices=nodes.map(v=>idOf(v,'vertex'));
 if(new Set(vertices).size!==vertices.length)
  fail('duplicate named vertex');
 vertices.sort();
 const index=new Map(vertices.map((v,i)=>[v,i]));
 idOf(source,'source');idOf(sink,'sink');
 if(source===sink||!index.has(source)||!index.has(sink))
  fail('source and sink must be distinct admitted vertices');
 const count=vertices.length,src=index.get(source),dst=index.get(sink);
 const seen=new Set();
 const admitted=links.map(raw=>{
  if(raw===null||typeof raw!=='object'||Array.isArray(raw))
   fail('one directed link record required');
  const id=idOf(raw.id,'link'),from=idOf(raw.from,'tail'),
    to=idOf(raw.to,'head');
  if(seen.has(id))fail('duplicate content-qualified link id');
  seen.add(id);
  if(!index.has(from)||!index.has(to)||from===to)
   fail('link requires distinct admitted vertices');
  if(to===source||from===sink)
   fail('no admitted work flows into source or out of sink');
  const cap=amountOf(raw.capacity,'link capacity');
  return {id,from,to,cap};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 const edges=[],out=Array.from({length:count},()=>[]);
 for(const link of admitted){
  const u=index.get(link.from),v=index.get(link.to),i=edges.length;
  edges.push({u,v,cap:link.cap,flow:0n,original:link.id});
  edges.push({u:v,v:u,cap:0n,flow:0n,original:null});
  out[u].push(i);out[v].push(i+1);
 }
 const residual=e=>e.cap-e.flow;
 const levels=new Int32Array(count),positions=new Int32Array(count);
 function levelGraph(){
  levels.fill(-1);levels[src]=0;
  const queue=[src];
  for(let k=0;k<queue.length;k++){
   const u=queue[k];
   for(const i of out[u]){
    const e=edges[i];
    if(residual(e)>0n&&levels[e.v]===-1){
     levels[e.v]=levels[u]+1;queue.push(e.v);
    }
   }
  }
  return levels[dst]!==-1;
 }
 function send(u,budget){
  if(u===dst)return budget;
  const adjacent=out[u];
  while(positions[u]<adjacent.length){
   const i=adjacent[positions[u]],e=edges[i];
   if(residual(e)>0n&&levels[e.v]===levels[u]+1){
    const left=residual(e),sent=send(e.v,budget<left?budget:left);
    if(sent>0n){e.flow+=sent;edges[i^1].flow-=sent;return sent;}
   }
   positions[u]++;
  }
  return 0n;
 }
 let max=0n;
 // The sum of all original outgoing capacities is a finite upper bound.
 const limit=out[src].reduce((s,i)=>s+edges[i].cap,0n);
 while(levelGraph()){
  positions.fill(0);
  for(;;){
   const delta=send(src,limit-max);
   if(delta===0n)break;
   max+=delta;
  }
 }
 const balance=Array.from({length:count},()=>0n);
 const readings=admitted.map((link,i)=>{
  const e=edges[2*i],moved=e.flow;
  if(moved<0n||moved>e.cap)fail('computed flow violates admitted edge capacity');
  balance[e.u]+=moved;balance[e.v]-=moved;
  return freeze({id:link.id,from:link.from,to:link.to,
   capacity:e.cap.toString(),moved:moved.toString(),
   remaining:(e.cap-moved).toString()});
 });
 if(balance[src]!==max||balance[dst]!==-max||
    balance.some((b,i)=>i!==src&&i!==dst&&b!==0n))
  fail('computed flow violates oriented interior conservation');
 // The residual reachable set is the canonical witnessed maximum-flow cut.
 const reachable=new Set([src]),todo=[src];
 for(let k=0;k<todo.length;k++){
  for(const i of out[todo[k]]){
   const e=edges[i];
   if(residual(e)>0n&&!reachable.has(e.v)){
    reachable.add(e.v);todo.push(e.v);
   }
  }
 }
 if(reachable.has(dst))fail('maximum-flow witness leaves a sink residual path');
 const crossing=readings.filter(r=>
  reachable.has(index.get(r.from))&&!reachable.has(index.get(r.to)));
 const cutCapacity=crossing.reduce((sum,r)=>sum+BigInt(r.capacity),0n);
 if(cutCapacity!==max||crossing.some(r=>r.remaining!=='0'))
  fail('maximum-flow witness violates the min-cut bound');
 const allSource=readings.filter(r=>r.from===source)
   .reduce((sum,r)=>sum+BigInt(r.capacity),0n);
 const allSink=readings.filter(r=>r.to===sink)
   .reduce((sum,r)=>sum+BigInt(r.capacity),0n);
 return freeze({
  type:'ObsmetrologiaFiniteCapacityFlow',version:1,unit,source,sink,
  maxRoutable:max.toString(),
  sourceCapacity:allSource.toString(),sinkCapacity:allSink.toString(),
  unservedSourcePotential:(allSource-max).toString(),
  unusedSinkPotential:(allSink-max).toString(),
  links:freeze(readings),
  minCut:freeze({reachable:freeze(vertices.filter((_,i)=>reachable.has(i))),
   crossingLinkIds:freeze(crossing.map(r=>r.id)),
   capacity:cutCapacity.toString()}),
  conservation:freeze({kind:'oriented-interior-balance',
   allInteriorVerticesConserved:true,maximumEqualsMinimumCut:true}),
  receiving:'pure-exact-source-graph-proof-not-runtime-reservation',
  limitation:'Edges are caller-admitted legal paths, not discovered market demand, execution rights, fresh resource quotas, solved fluid equations, or independently received production effects.'
 });
}



/**
 * Compute an ACTUAL finite allocation, not just an overcapacity warning.
 *
 * Each route has a demanded quantity and consumes one unit from EVERY
 * original source named by its \`uses\` set. Many routes can share each source,
 * and one route may traverse several shared bottlenecks. This is a finite
 * capacitated hypergraph, not generally reducible to ordinary max flow:
 * splitting a route at a shared source would introduce spurious path mixing.
 *
 * Phase 1 is exact weighted max-min progressive filling on one grade: active
 * route i grows at rate demand_i, raising each participating route's fulfilled
 * fraction equally until a shared source saturates or demand is met. Only
 * routes affected by that event freeze; unrelated traffic keeps growing.
 * The continuous ideal is represented by reduced exact BigInt rationals.
 *
 * Phase 2 computes conservative whole-atom lower bounds and optimizes the
 * residual up-to-one-atom rounding choices via the ORIGINAL Data/Metrologic
 * finite-vector allocation solver. This maximizes total integer atoms from
 * the rounded ideal without violating ANY shared source. An exhausted
 * explicit search budget returns a feasible candidate with \`exact:false\`,
 * never a fictitious optimality receipt. All effects and rights remain with
 * the original consuming Work host; the planner does not reserve anything.
 */
import {
  hostRatio, addHostRatio, subtractHostRatio, compareHostRatio,
} from "../number/wire-ratio.mjs";
import { solveFiniteVectorCapacity } from "../number/finite-capacity.mjs";

const SHARE_NAT=/^(?:0|[1-9][0-9]{0,79})$/u;
const fraction=(numerator,denominator=1n)=>
  hostRatio(String(numerator),String(denominator));
const plus=(a,b)=>addHostRatio(a,b);
const minus=(a,b)=>subtractHostRatio(a,b);
const multiplyNat=(a,n)=>fraction(BigInt(a.numerator)*n,BigInt(a.denominator));
const divideNat=(a,n)=>fraction(BigInt(a.numerator),BigInt(a.denominator)*n);
const comparison=(a,b)=>compareHostRatio(a,b);
const ZERO=fraction(0n);
const ONE=fraction(1n);
const whole=f=>BigInt(f.numerator)/BigInt(f.denominator);
const remainder=f=>fraction(BigInt(f.numerator)%BigInt(f.denominator),BigInt(f.denominator));
const boundedNat=(value,label)=>{
  if(typeof value!=="string"||!SHARE_NAT.test(value))
    fail(label+" must be a canonical nonnegative integer of at most 80 digits");
  return BigInt(value);
};

export function allocateFairSharedSources({
  unit, sources, routes, maxSearchNodes = 120000,
} = {}) {
  idOf(unit,"single original resource grade");
  if(!Array.isArray(sources)||sources.length===0||sources.length>256)
    fail("1..256 original shared capacity sources required");
  if(!Array.isArray(routes)||routes.length===0||routes.length>256)
    fail("1..256 original transport routes required");
  if(!Number.isSafeInteger(maxSearchNodes)||maxSearchNodes<1||maxSearchNodes>2000000)
    fail("a positive finite whole-atom search budget is required");

  const sourceIds=new Set();
  const capacitySources=sources.map(record=>{
    const id=idOf(record?.id,"capacity-source identity");
    if(sourceIds.has(id))fail("duplicate original capacity-source identity");
    sourceIds.add(id);
    return {id, capacity:boundedNat(record.capacity,"source capacity")};
  }).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const capacityById=new Map(capacitySources.map(s=>[s.id,s.capacity]));

  const routeIds=new Set();
  const requests=routes.map(record=>{
    const id=idOf(record?.id,"route identity");
    if(routeIds.has(id))fail("duplicate original route identity");
    routeIds.add(id);
    const demand=boundedNat(record.demand,"route demand");
    if(!Array.isArray(record.uses)||record.uses.length===0||record.uses.length>32)
      fail("each route must identify 1..32 original shared sources");
    const used=new Set();
    for(const ref of record.uses){
      const name=idOf(ref,"route source identity");
      if(!capacityById.has(name))fail("route uses a missing original source");
      if(used.has(name))fail("one route cannot consume one capacity source twice");
      used.add(name);
    }
    return {id, demand, uses:[...used].sort()};
  }).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const bySource=new Map(capacitySources.map(s=>[s.id,[]]));
  requests.forEach((r,i)=>r.uses.forEach(s=>bySource.get(s).push(i)));
  const allocations=requests.map(()=>ZERO);
  const active=new Set(requests.flatMap((r,i)=>r.demand>0n?[i]:[]));
  const load=s=>bySource.get(s).reduce((total,i)=>plus(total,allocations[i]),ZERO);
  const stages=[];

  while(active.size>0) {
    let step=null;
    for(const i of active){
      const r=requests[i];
      const time=divideNat(minus(fraction(r.demand),allocations[i]),r.demand);
      if(step===null||comparison(time,step)<0)step=time;
    }
    for(const source of capacitySources){
      const rate=bySource.get(source.id).reduce((n,i)=>
        n+(active.has(i)?requests[i].demand:0n),0n);
      if(rate===0n)continue;
      const room=minus(fraction(source.capacity),load(source.id));
      if(comparison(room,ZERO)<0)
        fail("internal fair progression exceeded a declared source capacity");
      const event=divideNat(room,rate);
      if(comparison(event,step)<0)step=event;
    }
    if(step===null)fail("no progressive-filling event found");
    for(const i of active)
      allocations[i]=plus(allocations[i],multiplyNat(step,requests[i].demand));

    const constrained=new Set(capacitySources.filter(source=>
      comparison(load(source.id),fraction(source.capacity))===0).map(s=>s.id));
    const finished=[];
    for(const i of active){
      const r=requests[i];
      if(comparison(allocations[i],fraction(r.demand))===0||
         r.uses.some(name=>constrained.has(name))){
        active.delete(i);
        finished.push(r.id);
      }
    }
    if(finished.length===0)
      fail("progressive filling did not resolve a saturated source or completed route");
    stages.push(freeze({increaseFraction:step, frozenRoutes:freeze(finished.sort()),
      saturatedSources:freeze([...constrained].sort())}));
  }

  // Round the exact fair ideal down, then find the maximum number of
  // independent one-atom increases under ALL original shared constraints.
  const floors=allocations.map(whole);
  const usedAtFloor=capacitySources.map(s=>bySource.get(s.id)
    .reduce((sum,i)=>sum+floors[i],0n));
  const remaining=capacitySources.map((s,j)=>s.capacity-usedAtFloor[j]);
  if(remaining.some(n=>n<0n))
    fail("exact progressive filling produced an impossible integer lower bound");
  const fractional=requests.flatMap((r,i)=>
    comparison(remainder(allocations[i]),ZERO)>0?[i]:[]);
  // Among multiple maximum-throughput integer roundings, the original
  // finite-vector tie rule prefers LATER lots. Put larger fractional
  // expectations later; never invent host float proportions.
  fractional.sort((a,b)=>
    comparison(remainder(allocations[a]),remainder(allocations[b])) ||
    (requests[a].id<requests[b].id?-1:requests[a].id>requests[b].id?1:0));
  let selected=[],rounding={exact:true,searchTruncated:false,visitedNodes:0};
  if(fractional.length){
    const solution=solveFiniteVectorCapacity({
      capacities:remaining,
      requests:fractional.map(i=>capacitySources.map(source=>
        requests[i].uses.includes(source.id)?1n:0n)),
      benefits:fractional.map(()=>1n),
      maxSearchNodes,
    });
    selected=solution.selectedIndexes.map(j=>fractional[j]);
    rounding={exact:solution.exact,searchTruncated:solution.searchTruncated,
      visitedNodes:solution.visitedNodes};
  }
  const final=[...floors];
  for(const i of selected)final[i]+=1n;
  const sourceReadings=capacitySources.map((s,j)=>{
    const used=bySource.get(s.id).reduce((sum,i)=>sum+final[i],0n);
    if(used>s.capacity)fail("an integer route allocation exceeds shared capacity");
    return freeze({id:s.id,capacity:s.capacity.toString(),
      allocated:used.toString(),remaining:(s.capacity-used).toString(),
      routeIds:freeze(bySource.get(s.id).map(i=>requests[i].id)),
      binding:used===s.capacity});
  });
  const routeReadings=requests.map((r,i)=>{
    const accepted=final[i];
    if(accepted>r.demand)fail("an allocation exceeded source demand");
    const satisfaction=r.demand===0n?ONE:fraction(accepted,r.demand);
    return freeze({
      id:r.id,demand:r.demand.toString(),allocated:accepted.toString(),
      unserved:(r.demand-accepted).toString(),uses:freeze([...r.uses]),
      idealAtoms:allocations[i],idealFulfillment:r.demand===0n?ONE:divideNat(allocations[i],r.demand),
      wholeFulfillment:satisfaction,
    });
  });
  const demanded=requests.reduce((n,r)=>n+r.demand,0n);
  const allocated=final.reduce((n,x)=>n+x,0n);
  return freeze({
    kind:"metrologic.fairSharedSourceAllocation.v1",
    unit,totalDemand:demanded.toString(),totalAllocated:allocated.toString(),
    totalUnserved:(demanded-allocated).toString(),
    routes:freeze(routeReadings),sources:freeze(sourceReadings),
    fairness:freeze({method:"exact-weighted-max-min-progressive-filling",
      stages:freeze(stages),weights:"original-route-demand",
      rounding:"max-whole-atom-throughput-at-most-one-above-ideal-floor",
      integerRoundOptimal:rounding.exact,
      exploredNodes:rounding.visitedNodes,searchTruncated:rounding.searchTruncated}),
    standing:"computed-candidate-not-reserved-or-executed",
    physicalEffects:"not-observed",
  });
}



/**
 * Explore the actual discrete response geometry of the SAME computed resource
 * allocation when independently identified sources get one extra unit.
 *
 * The first finite difference answers "which bottleneck helps by itself?".
 * The mixed second difference finds complementary bottlenecks invisible to
 * single-source scores: Δ_sΔ_t U = U(c+e_s+e_t) − U(c+e_s)
 * − U(c+e_t) + U(c). This is source-conditioned response of a particular
 * allocator and objective, NOT a physical constitutive law, shadow price,
 * magnetic field, intervention recommendation or observed provider change.
 *
 * Every counterfactual reuses allocateFairSharedSources and therefore the
 * original multi-source constraints, exact rational progression and existing
 * finite integer packing. No second optimization engine is created.
 */
export function capacityUpgradeResponse({
  unit,sources,routes,probeSourceIds,increment="1",maxSearchNodes=120000,
}={}) {
  if(!Array.isArray(probeSourceIds)||probeSourceIds.length<1||probeSourceIds.length>6)
    fail("capacity response needs 1..6 original source identities to probe");
  const seen=new Set();
  for(const source of probeSourceIds){
    const name=idOf(source,"response source identity");
    if(seen.has(name))fail("capacity response source repeated");
    seen.add(name);
  }
  if(!Array.isArray(sources)||seen.size>sources.length||
      [...seen].some(name=>!sources.some(source=>source?.id===name)))
    fail("capacity response probes require original admitted source identities");
  const step=boundedNat(increment,"counterfactual capacity increase");
  if(step===0n)fail("counterfactual response requires a positive intervention amount");
  const baseInput={unit,sources,routes,maxSearchNodes};
  const baseline=allocateFairSharedSources(baseInput);
  const update=(names)=>{
    const expanded=sources.map(source=>({
      id:source.id,
      capacity:(BigInt(source.capacity)+(names.includes(source.id)?step:0n)).toString(),
    }));
    return allocateFairSharedSources({...baseInput,sources:expanded});
  };
  const single=new Map();
  for(const name of [...seen].sort())single.set(name,update([name]));
  const first=freeze([...single].map(([name,result])=>freeze({
    sourceId:name,increaseAtoms:increment,
    previousAtoms:baseline.totalAllocated,nextAtoms:result.totalAllocated,
    marginalGainAtoms:(BigInt(result.totalAllocated)-BigInt(baseline.totalAllocated)).toString(),
    integerRoundOptimal:result.fairness.integerRoundOptimal,
  })));
  const interactions=[];
  const ordered=[...seen].sort();
  for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
    const left=ordered[i],right=ordered[j];
    const combined=update([left,right]);
    const delta=BigInt(combined.totalAllocated)-BigInt(single.get(left).totalAllocated)
      -BigInt(single.get(right).totalAllocated)+BigInt(baseline.totalAllocated);
    interactions.push(freeze({
      sourceIds:freeze([left,right]),
      combinedAllocatedAtoms:combined.totalAllocated,
      mixedDifferenceAtoms:delta.toString(),
      interpretation:delta>0n?"complementary-bottlenecks"
        :delta<0n?"substitutable-bottlenecks":"no-second-difference-at-this-step",
      integerRoundOptimal:combined.fairness.integerRoundOptimal,
    }));
  }
  return freeze({
    kind:"metrologic.sharedSourceFiniteResponse.v1",
    unit,incrementAtoms:increment,
    baselineAllocatedAtoms:baseline.totalAllocated,
    firstDifferences:first,secondDifferences:freeze(interactions),
    allIntegerRoundingsOptimal:baseline.fairness.integerRoundOptimal&&
      [...single.values()].every(result=>result.fairness.integerRoundOptimal)&&
      interactions.every(result=>result.integerRoundOptimal),
    sourceTruth:"caller-reported-counterfactual-capacities-not-observed-effects",
    standing:"finite-allocation-response-not-physical-law-or-executed-upgrade",
  });
}
