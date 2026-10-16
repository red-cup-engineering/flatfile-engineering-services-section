/**
 * Explicit finite bead-port routing: holes are internal bead transitions and
 * listed external port segments join passes. Unlike causal K(C) sequencing,
 * an actual thread walk can revisit a lenticule and close a cycle.
 *
 * An admitted route is an exact combinatorial witness, NOT a material embedding,
 * collision check, tension/friction model, cultural license or Lean proof.
 * The material graph's thread, contact, cell and visible adjacencies remain
 * separate; only the actually traversed THREAD segments are returned here.
 */
import { condensate } from "./port-condensate.mjs";

const MAX_BEADS = 4096;
const MAX_PASSES = 65536;
const MAX_LINKS = 131072;
const MAX_STATES = 300000;
const pairKey = (beadId, port) => JSON.stringify([beadId, port]);
const linkKey = (from, to) => JSON.stringify([from.beadId, from.port, to.beadId, to.port]);
const fail = (message) => { throw new TypeError("port-thread-routing: " + message); };
const id = (value, where) => {
  if (typeof value !== "string" || value.length === 0 || value.length > 1024)
    fail(where + " must be a nonempty bounded string");
  return value;
};
const portRef = (port, where) => {
  if (!port || typeof port !== "object" || Array.isArray(port)) fail(where + " must be a port reference");
  return { beadId: id(port.beadId, where + ".beadId"), port: id(port.port, where + ".port") };
};

function modelOf({ beads, links }) {
  if (!Array.isArray(beads) || beads.length > MAX_BEADS || !Array.isArray(links) || links.length > MAX_LINKS)
    fail("requires bounded beads and links arrays");
  const byBead = new Map();
  const holeOptions = [];
  for (const [index, bead] of beads.entries()) {
    const beadId = id(bead?.id, "beads[" + index + "].id");
    if (byBead.has(beadId)) fail("duplicate bead ID " + beadId);
    if (!Array.isArray(bead.holes) || bead.holes.length === 0 || bead.holes.length > 24)
      fail("each bead requires 1..24 explicitly paired holes");
    const knownPorts = new Map();
    const holes = bead.holes.map((pair, holeIndex) => {
      if (!Array.isArray(pair) || pair.length !== 2) fail("a hole must pair exactly two ports");
      const a = id(pair[0], "hole port"), b = id(pair[1], "hole port");
      if (a === b || knownPorts.has(a) || knownPorts.has(b))
        fail("hole endpoints must be different, with distinct mouths on this bead");
      knownPorts.set(a, holeIndex);
      knownPorts.set(b, holeIndex);
      holeOptions.push(Object.freeze({ beadId, beadIndex: index, holeIndex, enter: a, exit: b }));
      holeOptions.push(Object.freeze({ beadId, beadIndex: index, holeIndex, enter: b, exit: a }));
      return Object.freeze([a, b]);
    });
    byBead.set(beadId, { index, holes: Object.freeze(holes), knownPorts });
  }
  const connections = new Set();
  for (const [index, link] of links.entries()) {
    const from = portRef(link?.from, "links[" + index + "].from");
    const to = portRef(link?.to, "links[" + index + "].to");
    for (const p of [from, to]) {
      if (!byBead.get(p.beadId)?.knownPorts.has(p.port))
        fail("external link refers to an absent bead port");
    }
    const key = linkKey(from, to);
    if (connections.has(key)) fail("duplicate external port link");
    connections.add(key);
  }
  return { byBead, holeOptions, connections, beads };
}

/**
 * Orient each hole once per direction. Each admitted external connector has
 * exactly one source exit pass and one target entry pass (ports are unique
 * within a bead), so the transition graph costs O(passes + connectors).
 * This is independent of contact, visible and stitch-cell adjacencies.
 */
function orientedPassGraphOf(carrier) {
  const options=carrier.holeOptions;
  const entered=new Map(),exited=new Map();
  const outgoing=options.map(()=>[]),incoming=options.map(()=>[]);
  for(let i=0;i<options.length;i++){
    const p=options[i];
    entered.set(pairKey(p.beadId,p.enter),i);
    exited.set(pairKey(p.beadId,p.exit),i);
  }
  for(const key of carrier.connections){
    const [a,ap,b,bp]=JSON.parse(key);
    const from=exited.get(pairKey(a,ap)),to=entered.get(pairKey(b,bp));
    if(from===undefined||to===undefined)
      throw new TypeError("port-thread-routing: connector has no legal hole pass");
    outgoing[from].push(to);incoming[to].push(from);
  }
  return {options,outgoing,incoming};
}

/** Iterative strong-components, no call-stack growth with carrier size. */
function stronglyConnectedPasses(graph) {
  const n=graph.options.length,seen=new Uint8Array(n),finish=[];
  for(let root=0;root<n;root++){
    if(seen[root])continue;
    seen[root]=1;
    const stack=[{at:root,next:0}];
    while(stack.length){
      const top=stack[stack.length-1];
      if(top.next<graph.outgoing[top.at].length){
        const next=graph.outgoing[top.at][top.next++];
        if(!seen[next]){seen[next]=1;stack.push({at:next,next:0});}
      }else{finish.push(top.at);stack.pop();}
    }
  }
  const componentByPass=new Int32Array(n).fill(-1),components=[];
  for(let i=finish.length-1;i>=0;i--){
    const root=finish[i];
    if(componentByPass[root]>=0)continue;
    const which=components.length,members=[],stack=[root];
    componentByPass[root]=which;
    while(stack.length){
      const at=stack.pop();members.push(at);
      for(const prior of graph.incoming[at])if(componentByPass[prior]<0){
        componentByPass[prior]=which;stack.push(prior);
      }
    }
    members.sort((a,b)=>a-b);
    components.push(members);
  }
  return {componentByPass,components};
}

/**
 * A nonempty closed port-word that visits every bead exists iff a CYCLIC
 * strongly connected component of the oriented pass graph contains at least
 * one pass for every listed bead. Necessary: a closed walk's states mutually
 * reach one another. Sufficient: join bead representatives inside that SCC
 * and return to the start. This does not establish geometrical realizability
 * or the ITCS graph-tightening junction connectivity condition.
 */
function closedFeasibilityOfCarrier(carrier) {
  const graph=orientedPassGraphOf(carrier);
  const partition=stronglyConnectedPasses(graph);
  const n=carrier.beads.length;
  let witness=null,bestCoverage=[],cyclicComponents=0;
  const componentCoverages=[];
  for(const [componentIndex,members] of partition.components.entries()){
    const covered=[...new Set(members.map(i=>graph.options[i].beadIndex))]
      .sort((a,b)=>a-b);
    const cyclic=members.length>1 || (
      members.length===1&&graph.outgoing[members[0]].includes(members[0]));
    if(cyclic)cyclicComponents++;
    if(cyclic&&covered.length>bestCoverage.length)bestCoverage=covered;
    componentCoverages.push(Object.freeze({
      componentIndex,passCount:members.length,cyclic,
      beadIds:Object.freeze(covered.map(i=>carrier.beads[i].id)),
    }));
    if(witness===null&&n>0&&cyclic&&covered.length===n)
      witness={componentIndex,members,covered};
  }
  const feasible=witness!==null;
  const best=new Set(bestCoverage);
  const report=Object.freeze({
    kind:"aperiodic.portGraph.closedRouteFeasibility.v1",
    feasible,
    reason:feasible?null:n===0?"empty-closed-route":"no-covering-cyclic-component",
    beadCount:n,orientedPassCount:graph.options.length,
    connectorCount:carrier.connections.size,
    componentCount:componentCoverages.length,
    cyclicComponentCount:cyclicComponents,
    maxCyclicBeadsCovered:bestCoverage.length,
    componentCoverages:Object.freeze(componentCoverages),
    uncoveredFromLargestCyclicComponent:Object.freeze(
      carrier.beads.filter((_,i)=>!best.has(i)).map(b=>b.id)),
    ...(feasible?{
      coveringComponentIndex:witness.componentIndex,
      coveringPassIndices:Object.freeze([...witness.members]),
      representativePassIndices:Object.freeze(witness.covered.map(i=>
        witness.members.find(p=>graph.options[p].beadIndex===i))),
    }:{}),
  });
  return {report,graph,witness};
}

/** Graph-scale exact closed-route decision, independent of optimization. */
export function closedPortThreadFeasibilityOf(spec) {
  return closedFeasibilityOfCarrier(modelOf(spec)).report;
}

/**
 * Construct a valid covering closed word from a cyclic SCC. The shortest
 * route-length problem is separate: this may reuse passes, and a finite
 * search/route budget can refuse construction EVEN WHEN feasibility is proved.
 */
export function coveringPortThreadRouteOf({beads,links}={}) {
  const carrier=modelOf({beads,links});
  const {report,graph,witness}=closedFeasibilityOfCarrier(carrier);
  if(!report.feasible)return Object.freeze({...refusal(report.reason),feasibility:report});
  const allowed=new Uint8Array(graph.options.length);
  for(const p of witness.members)allowed[p]=1;
  const start=report.representativePassIndices[0],history=[start];
  const covered=new Uint8Array(beads.length);
  covered[graph.options[start].beadIndex]=1;
  let missing=beads.length-1,examined=0;
  const MAX_EXAMINED=6000000;
  // Stop at first matching state; parents reconstruct the genuine connectors.
  const shortestPath=(from,goal)=>{
    const seen=new Uint8Array(graph.options.length),parents=new Int32Array(graph.options.length).fill(-1);
    const queue=[from];
    seen[from]=1;
    let target=goal(from)?from:-1;
    for(let cursor=0;cursor<queue.length&&target<0;cursor++){
      for(const next of graph.outgoing[queue[cursor]]){
        if(++examined>MAX_EXAMINED)return null;
        if(!allowed[next]||seen[next])continue;
        seen[next]=1;parents[next]=queue[cursor];queue.push(next);
        if(goal(next)){target=next;break;}
      }
    }
    if(target<0)return [];
    const reversed=[];
    for(let at=target;at!==-1;at=parents[at])reversed.push(at);
    return reversed.reverse();
  };
  while(missing>0){
    const path=shortestPath(history[history.length-1],
      p=>!covered[graph.options[p].beadIndex]);
    if(path===null)return Object.freeze({...refusal("route-search-budget-exceeded"),feasibility:report});
    if(path.length<2)throw new TypeError("covering SCC lacks a required path");
    for(const p of path.slice(1)){
      history.push(p);
      const beadIndex=graph.options[p].beadIndex;
      if(!covered[beadIndex]){covered[beadIndex]=1;missing--;}
    }
    if(history.length>MAX_PASSES)
      return Object.freeze({...refusal("route-pass-budget-exceeded"),feasibility:report});
  }
  const last=history[history.length-1];
  if(!graph.outgoing[last].includes(start)){
    let closure;
    if(last===start){
      // A one-bead SCC may be cyclic WITHOUT any single-pass self-loop.
      // Return via a nontrivial two-or-more-pass cycle in that case.
      const neighbor=graph.outgoing[start].find(p=>allowed[p]);
      if(neighbor===undefined)throw new TypeError("cyclic SCC has no first connector");
      const back=shortestPath(neighbor,p=>p===start);
      closure=back===null?null:back.length===0?[]:[start,...back];
    }else{
      closure=shortestPath(last,p=>p===start);
    }
    if(closure===null)
      return Object.freeze({...refusal("route-search-budget-exceeded"),feasibility:report});
    if(closure.length<2)
      throw new TypeError("covering SCC has no admissible closing connector path");
    history.push(...closure.slice(1,-1));
  }
  if(history.length>MAX_PASSES)
    return Object.freeze({...refusal("route-pass-budget-exceeded"),feasibility:report});
  const passes=history.map(i=>({
    beadId:graph.options[i].beadId,
    enter:graph.options[i].enter,exit:graph.options[i].exit,
  }));
  const checked=portThreadRouteOf({beads,links,passes,closed:true,requireEveryBead:true});
  if(checked.kind!=="aperiodic.portGraph.threadRoute:witness")
    throw new TypeError("covering SCC produced an invalid independently checked walk");
  return Object.freeze({
    ...checked,feasibility:report,
    constructedBy:"cyclic-SCC with bounded shortest port connectors",
    examinedConnectorTransitions:examined,
  });
}

const refusal = (reason, atPassIndex = null) => Object.freeze({
  kind: "aperiodic.portGraph.threadRoute-obstruction", reason, atPassIndex,
});

/**
 * Independently check an explicitly supplied PORT walk. Repetition is legal;
 * per-bead and per-hole occupations must not be replaced by thread.length.
 * The loop closure is an explicit final-out to first-in connector.
 */
export function portThreadRouteOf(spec) {
  if (!spec || typeof spec !== "object") fail("expected a route object");
  const { byBead, connections, beads } = modelOf(spec);
  const passes = spec.passes;
  if (!Array.isArray(passes) || passes.length > MAX_PASSES) fail("passes must be a bounded array");
  if (typeof spec.closed !== "boolean" || typeof spec.requireEveryBead !== "boolean")
    fail("closed and requireEveryBead must be explicit booleans");
  if (spec.closed && passes.length === 0) return refusal("empty-closed-route");
  const localCounts = new Array(beads.length).fill(0);
  const holeCounts = beads.map(b => new Array(b.holes.length).fill(0));
  const route = [];
  for (const [i, pass] of passes.entries()) {
    const beadId = id(pass?.beadId, "passes[" + i + "].beadId");
    const enter = id(pass?.enter, "passes[" + i + "].enter");
    const exit = id(pass?.exit, "passes[" + i + "].exit");
    const bead = byBead.get(beadId);
    if (!bead) fail("route names an absent bead");
    const holeIndex = bead.knownPorts.get(enter);
    if (holeIndex === undefined || enter === exit || bead.knownPorts.get(exit) !== holeIndex)
      return refusal("unlisted-hole-transition", i);
    localCounts[bead.index]++;
    holeCounts[bead.index][holeIndex]++;
    route.push(Object.freeze({ passIndex: i, beadId, holeIndex, enter, exit }));
  }
  if (spec.requireEveryBead && localCounts.some(n => n === 0))
    return refusal("unvisited-bead");
  const segments = [];
  const edgeCount = passes.length === 0 ? 0 : passes.length - 1 + Number(spec.closed);
  for (let i = 0; i < edgeCount; i++) {
    const next = (i + 1) % route.length;
    const from = { beadId: route[i].beadId, port: route[i].exit };
    const to = { beadId: route[next].beadId, port: route[next].enter };
    if (!connections.has(linkKey(from, to))) return refusal("unlisted-external-connector", i);
    segments.push(Object.freeze({
      fromPassIndex: i, toPassIndex: next,
      from: Object.freeze(from), to: Object.freeze(to),
    }));
  }
  const occupations = Object.freeze(beads.map((b, i) => Object.freeze({
    beadId: b.id, count: localCounts[i], charge: condensate(localCounts[i]),
    holes: Object.freeze(holeCounts[i].map((count, holeIndex) => Object.freeze({
      holeIndex, count, charge: condensate(count),
    }))),
  })));
  return Object.freeze({
    kind: "aperiodic.portGraph.threadRoute:witness", closed: spec.closed,
    passCount: route.length, thread: Object.freeze(route),
    // Keep repeated directed segments, not a set of informal bead adjacencies.
    threadSegments: Object.freeze(segments), occupations,
    locallyOverOccupied: Object.freeze(occupations.filter(x => x.count >= 2).map(x => x.beadId)),
    globalPassCharge: condensate(route.length),
    // No claim is made about contact/cell/visible adjacency or physical jamming.
  });
}

/**
 * Independent lower bound on additive thread length, without optimizing.
 *
 * The certificate supplies d(s) < L for a set of covered-mask states.
 * Every seed with initial cost < L is represented, and for every listed
 * state every transition whose d(s)+weight < L has a successor in the
 * certificate with bound <= that cost. No certificate state admits a
 * terminal edge whose d(s)+closing cost is below L.
 *
 * By induction along ANY hypothetical lower-cost covering route, that
 * route would produce a state with a terminal total < L, contradicting
 * the checked closure. A separately checked route costing L is an upper
 * bound. Equality proves an EXACT minimum without rerunning Dijkstra.
 * The explicit 10k-state bound prevents creating enormous receipts.
 */
export function materialPortThreadOptimalityAdmits(spec,certificate) {
  const kind="aperiodic.portGraph.materialThreadOptimalityAdmission.v1";
  const deny=reason=>Object.freeze({kind,admitted:false,reason});
  if(!spec||typeof spec!=="object")return deny("invalid-route-input");
  const carrier=modelOf(spec),costs=materialLengthsOf(spec,carrier);
  if(spec.beads.length>9||carrier.holeOptions.length>60||spec.links.length>96)
    return deny("carrier-beyond-optimality-profile");
  const route=materialPortThreadRouteOf(spec);
  if(route.kind!=="aperiodic.portGraph.materialThreadRoute:witness")
    return deny("unadmitted-primal-route");
  const decimal=v=>typeof v==="string"&&/^(0|[1-9][0-9]*)$/.test(v);
  if(certificate?.kind!=="aperiodic.portGraph.materialThreadLowerBound.v1"||
     !decimal(certificate.thresholdUm)||
     !Array.isArray(certificate.states)||
     certificate.states.length>10000)
    return deny("malformed-certificate");
  const L=BigInt(certificate.thresholdUm);
  if(BigInt(route.totalLengthUm)!==L)return deny("primal-dual-gap");
  const {options,outgoing}=orientedPassGraphOf(carrier);
  const n=spec.beads.length,all=(1<<n)-1;
  const key=(a,b,mask)=>a+":"+b+":"+mask,rows=new Map();
  for(const s of certificate.states){
    if(!Number.isSafeInteger(s?.start)||s.start<0||s.start>=options.length||
       !Number.isSafeInteger(s?.last)||s.last<0||s.last>=options.length||
       !Number.isSafeInteger(s?.mask)||s.mask<1||s.mask>all||
       !(s.mask&(1<<options[s.start].beadIndex))||
       !(s.mask&(1<<options[s.last].beadIndex))||
       !decimal(s?.boundUm))
      return deny("malformed-state");
    const d=BigInt(s.boundUm),k=key(s.start,s.last,s.mask);
    if(d>=L||rows.has(k))return deny("invalid-bound-or-duplicate");
    rows.set(k,d);
  }
  const holeCost=options.map(p=>costs.holes[p.beadIndex][p.holeIndex]);
  const edgeCost=(a,b)=>costs.connectors.get(linkKey(
    {beadId:options[a].beadId,port:options[a].exit},
    {beadId:options[b].beadId,port:options[b].enter}));
  for(let i=0;i<options.length;i++){
    if(holeCost[i]>=L)continue;
    const d=rows.get(key(i,i,1<<options[i].beadIndex));
    if(d===undefined||d>holeCost[i])return deny("missing-or-too-high-seed");
  }
  for(const [k,d] of rows) {
    const [first,last,mask]=k.split(":").map(Number);
    if(mask===all){
      const close=spec.closed?edgeCost(last,first):0n;
      if(close!==undefined&&d+close<L)return deny("cheaper-terminal");
    }
    for(const next of outgoing[last]){
      const w=edgeCost(last,next)+holeCost[next];
      const candidate=d+w;
      if(candidate>=L)continue;
      const target=rows.get(key(first,next,mask|(1<<options[next].beadIndex)));
      if(target===undefined||target>candidate)
        return deny("missing-or-too-high-successor");
    }
  }
  return Object.freeze({
    kind,admitted:true,lengthUnit:"um",
    lowerBoundUm:String(L),upperBoundUm:route.totalLengthUm,
    checkedStates:rows.size,
  });
}

/**
 * Bounded shortest BEAD-PASS search over an explicit port graph. Multi-source
 * breadth-first search proves minimum number of hole traversals when it finds
 * a route covering every bead. Every route is independently rechecked above.
 * This is not Demaine-style minimum material thread length or minimum turn cost.
 */
export function minimumPortThreadRouteOf({ beads, links, closed = true } = {}) {
  const carrier = modelOf({ beads, links });
  if (typeof closed !== "boolean") fail("closed must be a boolean");
  const n = beads.length;
  if (n > 9 || carrier.holeOptions.length > 60 || links.length > 96)
    throw new RangeError("minimumPortThreadRouteOf is bounded to 9 beads, 60 oriented passes, 96 links");
  if (n === 0) return closed ? refusal("empty-closed-route") : portThreadRouteOf({ beads, links, passes: [], closed: false, requireEveryBead: true });
  const {options,outgoing:adjacent}=orientedPassGraphOf(carrier);
  const all = (1 << n) - 1;
  const queue = [], visited = new Set();
  const keyOf = state => state.start + ":" + state.last + ":" + state.mask;
  options.forEach((o, optionIndex) => {
    const state = { start: optionIndex, last: optionIndex, mask: 1 << o.beadIndex, previous: -1, depth: 1 };
    const key = keyOf(state);
    if (!visited.has(key)) { visited.add(key); queue.push(state); }
  });
  const terminal = state => state.mask === all && (!closed || carrier.connections.has(linkKey(
    { beadId: options[state.last].beadId, port: options[state.last].exit },
    { beadId: options[state.start].beadId, port: options[state.start].enter },
  )));
  for (let i = 0; i < queue.length; i++) {
    if (i >= MAX_STATES) return refusal("search-budget-exceeded");
    const state = queue[i];
    if (terminal(state)) {
      const history = [];
      for (let at = i; at !== -1; at = queue[at].previous) history.push(options[queue[at].last]);
      history.reverse();
      const passes = history.map(o => ({ beadId: o.beadId, enter: o.enter, exit: o.exit }));
      const checked = portThreadRouteOf({ beads, links, passes, closed, requireEveryBead: true });
      if (checked.kind !== "aperiodic.portGraph.threadRoute:witness")
        throw new TypeError("minimumPortThreadRouteOf constructed an inadmissible witness");
      return Object.freeze({ ...checked, minimalPassCount: checked.passCount, statesExamined: i + 1, minimalBy: "bounded-unit-cost-breadth-first-search" });
    }
    for (const next of adjacent[state.last]) {
      const candidate = { start: state.start, last: next,
        mask: state.mask | (1 << options[next].beadIndex), previous: i, depth: state.depth + 1 };
      const key = keyOf(candidate);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(candidate);
    }
  }
  return refusal(closed ? "no-closed-thread-route" : "no-covering-thread-route");
}

/**
 * Dimensioned assumptions, not invented geometry. Every hole traversal is
 * explicitly priced by holeLengthsUm aligned with its paired mouths; each
 * connector has lengthUm. Units: integer micrometres, summed as BigInt.
 * This does not certify a calibrated instrument, geometry, tension or slack.
 */
function materialLengthsOf(spec,carrier=modelOf(spec)) {
  const exact=(v,context,zero)=>{
    if(!Number.isSafeInteger(v)||v<(zero?0:1))
      throw new RangeError("port-thread-routing: "+context+
        " must have an explicit "+(zero?"nonnegative":"positive")+
        " safe integer micrometre length");
    return BigInt(v);
  };
  const holes=spec.beads.map((bead,i)=>{
    if(!Array.isArray(bead.holeLengthsUm)||
       bead.holeLengthsUm.length!==bead.holes.length)
      fail("beads["+i+"].holeLengthsUm must match its paired holes");
    return bead.holeLengthsUm.map((v,j)=>
      exact(v,"beads["+i+"].holeLengthsUm["+j+"]",false));
  });
  const connectors=new Map();
  for(const [i,link] of spec.links.entries()) {
    const key=linkKey(link.from,link.to);
    if(!carrier.connections.has(key))fail("unknown material connector");
    connectors.set(key,exact(link.lengthUm,"links["+i+"].lengthUm",true));
  }
  return {holes,connectors};
}

/** Independently replay a checked port-word to measure the supplied additive
 * length. A repeated bead and repeated connector each incur their own cost.
 */
export function materialPortThreadRouteOf(spec) {
  if(!spec||typeof spec!=="object")fail("material route needs a source");
  const carrier=modelOf(spec),costs=materialLengthsOf(spec,carrier);
  const admitted=portThreadRouteOf(spec);
  if(admitted.kind!=="aperiodic.portGraph.threadRoute:witness")return admitted;
  const holes=admitted.thread.map(p=>costs.holes[
    carrier.byBead.get(p.beadId).index][p.holeIndex]);
  const links=admitted.threadSegments.map(s=>{
    const v=costs.connectors.get(linkKey(s.from,s.to));
    if(v===undefined)throw new TypeError("missing length for traversed connector");
    return v;
  });
  const add=arr=>arr.reduce((a,b)=>a+b,0n);
  const holeLength=add(holes),connectorLength=add(links);
  return Object.freeze({
    ...admitted,
    kind:"aperiodic.portGraph.materialThreadRoute:witness",
    lengthUnit:"um",
    holeLengthUm:String(holeLength),
    connectorLengthUm:String(connectorLength),
    totalLengthUm:String(holeLength+connectorLength),
    holePassLengthsUm:Object.freeze(holes.map(String)),
    connectorSegmentLengthsUm:Object.freeze(links.map(String)),
    lengthsCalibrated:false,
  });
}

function exactCostQueue() {
  const heap=[];
  const before=(x,y)=>x.cost<y.cost||(
    x.cost===y.cost&&x.order<y.order);
  return {
    get size(){return heap.length;},
    push(x){
      heap.push(x);
      let i=heap.length-1;
      while(i>0){
        const p=(i-1)>>1;
        if(!before(heap[i],heap[p]))break;
        [heap[i],heap[p]]=[heap[p],heap[i]];i=p;
      }
    },
    pop(){
      const root=heap[0],last=heap.pop();
      if(heap.length){
        heap[0]=last;
        for(let i=0;;){
          const l=2*i+1,r=l+1;
          let best=i;
          if(l<heap.length&&before(heap[l],heap[best]))best=l;
          if(r<heap.length&&before(heap[r],heap[best]))best=r;
          if(best===i)break;
          [heap[i],heap[best]]=[heap[best],heap[i]];i=best;
        }
      }
      return root;
    },
  };
}

/**
 * Exact weighted shortest covering port-word, within the existing finite
 * nine-bead limit. The state is (initial oriented pass, most recent pass,
 * covered bead mask), with additive nonnegative link/hole lengths. An
 * explicit goal edge prices closure, so the first extracted goal is optimal.
 * No cord geometry, junction-connectivity or material mechanics is assumed.
 */
export function minimumMaterialPortThreadRouteOf({beads,links,closed=true,includeOptimalityCertificate=false}={}) {
  if(typeof includeOptimalityCertificate!=="boolean")fail("includeOptimalityCertificate must be boolean");
  const carrier=modelOf({beads,links});
  if(typeof closed!=="boolean")fail("closed must be a boolean");
  const costs=materialLengthsOf({beads,links},carrier);
  if(beads.length>9||carrier.holeOptions.length>60||links.length>96)
    throw new RangeError("minimumMaterialPortThreadRouteOf is bounded to 9 beads, 60 oriented passes, 96 links");
  if(beads.length===0){
    if(closed)return refusal("empty-closed-route");
    const empty=materialPortThreadRouteOf({
      beads,links,passes:[],closed:false,requireEveryBead:true,
    });
    const result={...empty,minimalTotalLengthUm:"0",
      statesExamined:0,minimalBy:"exact nonnegative integer micrometre Dijkstra"};
    if(includeOptimalityCertificate) {
      const proof=Object.freeze({
        kind:"aperiodic.portGraph.materialThreadLowerBound.v1",
        thresholdUm:"0",states:Object.freeze([]),
      });
      const admission=materialPortThreadOptimalityAdmits(
        {beads,links,closed:false,passes:[],requireEveryBead:true},proof);
      if(!admission.admitted)throw new TypeError("empty material lower bound refused");
      result.optimalityCertificate=proof;
      result.optimalityAdmission=admission;
    }
    return Object.freeze(result);
  }
  const {options,outgoing}=orientedPassGraphOf(carrier);
  const holeCosts=options.map(p=>costs.holes[p.beadIndex][p.holeIndex]);
  const linkCost=(a,b)=>costs.connectors.get(linkKey(
    {beadId:options[a].beadId,port:options[a].exit},
    {beadId:options[b].beadId,port:options[b].enter}));
  const dist=new Map(),heap=exactCostQueue();
  const key=(start,last,mask)=>start+":"+last+":"+mask;
  let sequence=0,examined=0;
  const relax=(start,last,mask,cost,prior)=>{
    const k=key(start,last,mask);
    if(dist.has(k)&&dist.get(k).cost<=cost)return;
    dist.set(k,{start,last,mask,cost,prior});
    heap.push({key:k,cost,order:sequence++});
  };
  const all=(1<<beads.length)-1;
  for(let i=0;i<options.length;i++)
    relax(i,i,1<<options[i].beadIndex,holeCosts[i],null);
  let terminal=null;
  while(heap.size){
    const item=heap.pop();
    if(item.goal){terminal=item;break;}
    const state=dist.get(item.key);
    if(!state||state.cost!==item.cost)continue;
    if(++examined>MAX_STATES)return refusal("material-route-search-budget-exceeded");
    if(state.mask===all){
      const ending=closed?linkCost(state.last,state.start):0n;
      if(ending!==undefined)heap.push({
        goal:true,key:item.key,cost:state.cost+ending,order:sequence++,
      });
    }
    for(const next of outgoing[state.last]){
      const segment=linkCost(state.last,next);
      if(segment===undefined)throw new TypeError("port thread has an unpriced connector");
      relax(state.start,next,state.mask|(1<<options[next].beadIndex),
        state.cost+segment+holeCosts[next],item.key);
    }
    if(dist.size>MAX_STATES)return refusal("material-route-search-budget-exceeded");
  }
  if(!terminal)return refusal(closed?"no-closed-thread-route":"no-covering-thread-route");
  const route=[];
  for(let p=terminal.key;p!==null;p=dist.get(p).prior)
    route.push(dist.get(p).last);
  route.reverse();
  const received=materialPortThreadRouteOf({
    beads,links,closed,requireEveryBead:true,
    passes:route.map(i=>({beadId:options[i].beadId,
      enter:options[i].enter,exit:options[i].exit})),
  });
  if(received.kind!=="aperiodic.portGraph.materialThreadRoute:witness"||
     BigInt(received.totalLengthUm)!==terminal.cost)
    throw new TypeError("material route failed independent exact-length replay");
  const result={
    ...received,
    minimalTotalLengthUm:String(terminal.cost),statesExamined:examined,
    minimalBy:"exact nonnegative integer micrometre Dijkstra",
  };
  if(includeOptimalityCertificate) {
    const candidates=[...dist.values()].filter(s=>s.cost<terminal.cost);
    if(candidates.length>10000)
      return refusal("material-optimality-certificate-budget-exceeded");
    const states=candidates.map(s=>Object.freeze({
      start:s.start,last:s.last,mask:s.mask,boundUm:String(s.cost),
    }));
    const certificate=Object.freeze({
      kind:"aperiodic.portGraph.materialThreadLowerBound.v1",
      thresholdUm:String(terminal.cost),
      states:Object.freeze(states),
    });
    const admission=materialPortThreadOptimalityAdmits({
      beads,links,closed,requireEveryBead:true,
      passes:received.thread.map(p=>({
        beadId:p.beadId,enter:p.enter,exit:p.exit,
      })),
    },certificate);
    if(!admission.admitted)
      throw new TypeError("material thread length lower bound failed: "+admission.reason);
    result.optimalityCertificate=certificate;
    result.optimalityAdmission=admission;
  }
  return Object.freeze(result);
}
