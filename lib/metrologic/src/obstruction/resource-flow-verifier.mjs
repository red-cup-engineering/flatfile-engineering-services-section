/**
 * Independent proof checker for exact-resource-flow solver's funded result.
 *
 * Does NOT call the optimizer. Verifies conservation, capacities, source/demand
 * bounds, exact expenditure, budget and a residual-network dual potential.
 * A shortest augmenting path check independently establishes whether more
 * throughput is possible at the remaining budget.
 *
 * The unbudgeted summary is NOT covered by this funded-certificate verifier.
 * No real hydraulic, PV, geographic or governance facts are certified.
 */
import { ratAdd, ratCompare, ratEqual, ratIsZero, ratMultiply, ratNegate, ratSubtract, ratZero, rationalOfBigInts } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { resourceRatioString } from "./resource-flow-wire.mjs";

export function verifyResourceFlowCertificate(spec, claim) {
  // Independent verifier of the funded primal flow and dual optimality.
  // It does not invoke a flow-generation algorithm or accept an endpoint's
  // self-reported minimum without checking conservation and residual costs.
  if (!spec || !claim || !claim.withBudget || !Array.isArray(spec.nodes)
      || !Array.isArray(spec.links) || !Array.isArray(spec.sources)
      || !Array.isArray(spec.demands)) throw new TypeError("malformed problem or claim");
  const Z=ratZero;
  const parse = (v, signed=false) => {
    if (typeof v==="number") {
      if (!Number.isSafeInteger(v)) throw new TypeError("unsafe numeric claim");
      v=String(v);
    }
    if(typeof v!=="string" || v.length>8194 ||
       !(signed ? /^-?\d{1,4096}(?:\/[1-9]\d{0,4095})?$/.test(v)
         : /^\d{1,4096}(?:\/[1-9]\d{0,4095})?$/.test(v)))
       throw new RangeError("malformed exact rational");
    const [a,b="1"]=v.split("/");
    return rationalOfBigInts(BigInt(a), BigInt(b));
  };
  const fail = message => ({verified:false,reason:message});
  const ids = new Map();
  spec.nodes.forEach((s,i)=>{if(typeof s!=="string"||ids.has(s))throw new Error("bad nodes");ids.set(s,i)});
  if (ids.size<1 || ids.size>48 || spec.links.length>128 || spec.sources.length>48
      || spec.demands.length>48) throw new RangeError("problem exceeds bounds");
  const output=claim.withBudget;
  if(!Array.isArray(output.flows)||output.flows.length!==spec.links.length
      || !Array.isArray(output.supplied)||output.supplied.length!==spec.sources.length
      || !Array.isArray(output.served)||output.served.length!==spec.demands.length)
    return fail("primal rows do not match the source problem");
  const n=ids.size, SS=n, TT=n+1, N=n+2;
  if(!Array.isArray(output.reducedCostPotentials)||output.reducedCostPotentials.length!==N)
    return fail("missing residual dual potentials");
  const potentials=output.reducedCostPotentials.map(x=>parse(x,true));
  const balance=Array(N).fill(Z);
  const residual=[];
  const addResidual=(u,v,limit,used,cost)=>{
    if((ratCompare(used, Z) < 0)||(ratCompare(limit, used) < 0))throw new Error("out-of-capacity flow");
    if((ratCompare(limit, used) > 0))residual.push({u,v,capacity:ratSubtract(limit, used),cost});
    if((ratCompare(used, Z) > 0))residual.push({u:v,v:u,capacity:used,cost:ratNegate(cost)});
    balance[u]=ratSubtract(balance[u], used);
    balance[v]=ratAdd(balance[v], used);
  };
  let spent=Z,delivered=Z,totalDemand=Z;
  const seenLinks=new Set();
  for(let i=0;i<spec.links.length;i++){
    const l=spec.links[i],f=output.flows[i];
    if(!l||!f||typeof l.id!=="string"||seenLinks.has(l.id)||!ids.has(l.from)||!ids.has(l.to)||l.from===l.to
       ||f.id!==l.id||f.from!==l.from||f.to!==l.to)
      return fail("link identity/order/endpoints do not match");
    seenLinks.add(l.id);
    const cap=parse(l.capacity),cost=parse(l.unitResourceCost),used=parse(f.volume);
    if((ratCompare(used, cap) > 0))return fail("link capacity exceeded: "+l.id);
    spent=ratAdd(spent, ratMultiply(cost, used));
    addResidual(ids.get(l.from),ids.get(l.to),cap,used,cost);
  }
  const supplyIds=new Set(), demandIds=new Set();
  for(let i=0;i<spec.sources.length;i++){
    const x=spec.sources[i],r=output.supplied[i];
    if(!x||!r||!ids.has(x.node)||supplyIds.has(x.node)||x.node!==r.node)
      return fail("source admission identity mismatch");
    supplyIds.add(x.node);
    const cap=parse(x.capacity),used=parse(r.volume);
    if((ratCompare(used, cap) > 0))return fail("source supply exceeded");
    addResidual(SS,ids.get(x.node),cap,used,Z);
  }
  for(let i=0;i<spec.demands.length;i++){
    const x=spec.demands[i],r=output.served[i];
    if(!x||!r||!ids.has(x.node)||demandIds.has(x.node)||x.node!==r.node)
      return fail("demand identity mismatch");
    demandIds.add(x.node);
    const cap=parse(x.amount),used=parse(r.delivered);
    if((ratCompare(used, cap) > 0)||!ratEqual(parse(r.requested), cap))return fail("demand quantity mismatch");
    addResidual(ids.get(x.node),TT,cap,used,Z);
    delivered=ratAdd(delivered, used);
    totalDemand=ratAdd(totalDemand, cap);
  }
  for(let i=0;i<n;i++)if(!ratIsZero(balance[i]))return fail("node flow conservation failed: "+spec.nodes[i]);
  if(!ratEqual(balance[SS], ratNegate(delivered))||!ratEqual(balance[TT], delivered))
    return fail("super-source/sink throughput mismatch");
  if(!ratEqual(delivered, parse(output.delivered))||
      !ratEqual(spent, parse(output.resourceCost))||
      !ratEqual(ratSubtract(totalDemand, delivered), parse(output.remainingDemand)) ||
      !ratEqual(totalDemand, parse(claim.totalDemand)))
    return fail("claimed quantity/cost totals disagree with source flow");
  const budget=spec.budget===undefined||spec.budget===null?null:parse(spec.budget);
  if(budget!==null && (ratCompare(spent, budget) > 0))return fail("resource budget exceeded");
  if((claim.budget===null||claim.budget===undefined)!==(budget===null))
    return fail("reported budget presence does not match");
  if(budget!==null && !ratEqual(parse(claim.budget), budget))
    return fail("reported budget does not match");
  if(Boolean(claim.allDemandFeasible)!==ratEqual(delivered, totalDemand))
    return fail("all-demand feasibility flag mismatch");
  // A residual feasible potential satisfies c(u,v)+p(u)-p(v)>=0
  // on every arc with positive residual capacity. This proves there
  // is no negative-cost cycle, certifying minimum expenditure at this flow.
  for(const a of residual){
    if((ratCompare(ratSubtract(ratAdd(a.cost, potentials[a.u]), potentials[a.v]), Z) < 0))
      return fail("negative reduced-cost residual arc: not a min-cost flow");
  }
  // Exact Bellman-Ford from the super-source, only to certify that the
  // current maximum delivered amount cannot be increased for free.
  const dist=Array(N).fill(null);dist[SS]=Z;
  for(let round=0;round<N-1;round++){
    let changed=false;
    for(const a of residual){
      if(dist[a.u]===null)continue;
      const v=ratAdd(dist[a.u], a.cost);
      if(dist[a.v]===null||(ratCompare(v, dist[a.v]) < 0)){dist[a.v]=v;changed=true}
    }
    if(!changed)break;
  }
  if((ratCompare(delivered, totalDemand) < 0) && dist[TT]!==null) {
    if(budget===null)return fail("augmentable delivery under unlimited budget");
    if((ratCompare(spent, budget) < 0))return fail("affordable positive augmentation exists");
    if(!(ratCompare(dist[TT], Z) > 0))return fail("free or negative-cost augmentation exists");
  }
  return {verified:true,claim:"exact primal feasibility, minimum cost at this throughput and budget-optimal delivered volume under fixed linear rational costs",
    verifiedDelivered:resourceRatioString(delivered),verifiedResourceCost:resourceRatioString(spent),
    residualAdditionalUnitCost:dist[TT]===null?null:resourceRatioString(dist[TT]),
    scope:"algebraic model only: not real hydraulic feasibility, physical datum, policy or rights"};
}
