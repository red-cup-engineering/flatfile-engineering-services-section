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
