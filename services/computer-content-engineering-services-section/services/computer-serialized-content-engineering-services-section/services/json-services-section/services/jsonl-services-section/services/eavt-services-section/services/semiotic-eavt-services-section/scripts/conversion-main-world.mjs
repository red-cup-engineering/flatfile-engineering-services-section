/** One-time branch-only main-world converter. Original custody is never changed.
 * Current receiving forms, not old witness wrappers, govern the selected records.
 * See store-conversion.md and store-migration-map.md; no runtime legacy bridge. */
import fs from 'node:fs';
import path from 'node:path';
import {createBucketMap,streamJsonLines,sourceFiles,sourceStamp,assertSourceStamps,hashSource,witnessAt} from './conversion-buckets.mjs';

const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.length>0;
const instant=value=>text(value)&&Number.isFinite(Date.parse(value));

/** Canonical old path computation must corroborate a recovered subject. */
function claimSubject({kind,row,witness,file,source,dataArtifactAddress}){
 if(kind.startsWith('structured-work-intent-'))return kind;
 const [e,,v]=row;
 const candidates=[e?.session,v?.caller?.surface,v?.boundary?.surface,witness.observation.seat?.subject,typeof e==='string'?e:undefined];
 const niKind=/^ni-sha-256-([A-Za-z0-9_-]{43})$/u.exec(kind),actorKind=/^actor-ni-sha-256-([A-Za-z0-9_-]{43})$/u.exec(kind);
 if(niKind)candidates.push(`ni:///sha-256;${niKind[1]}`);
 if(actorKind)candidates.push(`actor:ni:///sha-256;${actorKind[1]}`);
 const matches=[...new Set(candidates.filter(text))].filter(subject=>{
  if(subject===kind)return true;
  if(typeof dataArtifactAddress!=='function')return false;
  const described=dataArtifactAddress({root:source,tier:'log',encoding:'jsonl',at:String(row[3]),action:'claim-session',subject});
  return path.basename(described.path)===path.basename(file).replace(/\.witnesses$/u,'');
 });
 return matches.length===1?matches[0]:undefined;
}

function selection(witness,kind,context){
 const row=witness.observation.payload;if(!Array.isArray(row)||row.length!==4)return;
 const semantic=context.semanticRecordOf(witness),[e,a,v,t]=row,plain={e,a,v,t},value=semantic?.record;
 const common={original:witness.id,identity:semantic?.id,at:semantic?.recordedAt??witness.observation.time,namedCauses:witness.observation.causes??[]};
 if((object(e)&&e.kind==='metroplat.claim-session')||kind.startsWith('structured-work-intent-')||kind.startsWith('actor-')||kind.startsWith('ni-sha-256-')){
  const thread=claimSubject({...context,kind,row,witness});if(thread===undefined)return {unqualified:'claim-thread-subject-unresolved'};
  return {...common,type:'claim-session',thread,claim:true,log:true,record:{...plain,thread,...(witness.observation.seat===undefined?{}:{seat:witness.observation.seat})}};
 }
 if(kind==='capability-assertions'&&v?.kind==='capability.assertion')return {...common,type:'capability-assertion',thread:'capability-assertions',record:v};
 if(kind==='office-incumbency')return {...common,type:'office-incumbency',record:object(value)?value:v};
 if(kind==='character-masks')return {...common,type:'character-mask',record:object(value)?value:v};
 if(kind==='harness-carriers')return {...common,type:'harness-carrier',record:object(value)?value:v};
 if(kind==='character-inbox'){
  const record=object(value)?value:v;if(!text(record?.character))return {unqualified:'character-inbox-subject-unresolved'};
  return {...common,type:'character-inbox',record,thread:record.character};
 }
 if(kind==='body-records'){
  const record=object(value)?value:v,thread=record?.character??[record?.to].flat()[0];if(!text(thread))return {unqualified:'body-subject-unresolved'};
  return {...common,type:'body-record',record,thread};
 }
 if(kind==='metroplat.clock.schedule'&&text(value?.id))return {...common,type:'clock-schedule',record:value,thread:value.id,closed:value.retired===true};
 if(kind==='encounter'&&text(e))return {...common,type:'encounter-result',record:plain,thread:e};
 if(kind==='agent-session-token-usage')return {...common,type:'token-usage-event',record:plain};
 if(kind==='work-arena-move'&&object(value))return {...common,type:'work-arena-move',record:value,arena:true};
 if(kind==='work-outcome'&&object(value))return {...common,type:'work-outcome',record:value,log:true};
 if(kind==='knowing.claims'&&object(value))return {...common,type:'claim',record:{...value,...(semantic.told.for===true&&semantic.told.against===false?{}:{told:semantic.told})}};
 if(kind==='peer-liveness'&&object(value)&&text(value.peer))return {...common,type:'peer-liveness',record:value,thread:value.peer};
 if(kind==='enterprise'&&semantic&&/^(?:contact|order|party|resource|cost|settlement|signature|bid|control)$/u.test(semantic.category))return {...common,type:'enterprise-'+semantic.category,record:value};
 if(kind==='anchored-findings'&&object(value)&&text(value.subject))return {...common,type:'anchored-finding',record:value,thread:value.subject};
 if(kind==='codex-tasks'&&object(value)&&text(value.id))return {...common,type:'codex-task',record:value,thread:value.id};
 if(kind==='lean-checks'&&object(value)&&text(value.id))return {...common,type:'lean-check',record:value,thread:value.id};
 if(kind==='inference-receiving-attempt'&&object(value))return {...common,type:'inference-receiving-attempt',record:value};
}

/** All supplier functions come from independently selected, fabricated providers.
 * Temporary maps contain byte positions and addresses, never an in-memory store table. */
export async function convertMainWorld({source,output,oldRoot,newRoot,store,report,parseJournalWitness,openSegmentReader,semanticRecordOf,niBucketPath,semanticAddress,dataArtifactAddress}){
 if(!store||![parseJournalWitness,openSegmentReader,semanticRecordOf,niBucketPath,semanticAddress].every(fn=>typeof fn==='function'))throw new TypeError('exact original readers and current writers required');
 const mapRoot=path.join(output,'.conversion-main'),maps=createBucketMap(mapRoot,niBucketPath),stamps=new Map(),active=new Set();
 fs.mkdirSync(mapRoot,{recursive:true,mode:0o700});
 report.mainConsumers={claimSession:'feltos/src/work/claim-session-store.mjs',capabilities:'computer-system-engine/src/rpc/capability-assertions.mjs',offices:'metroplat/src/offices.mjs',bodies:'metroplat/src/bodies.mjs',clock:'organizing/src/work/recurring.mjs'};
 report.unqualifiedSources??={};report.sourceOnly??={};report.sourceSegments??=[];report.types??={};
 report.referencesRewritten??=0;report.referencesLeft??=0;report.causesDropped??=0;
 const count=type=>report.types[type]??={read:0,written:0,duplicates:0,heads:0,verified:0};
 const observe=file=>{for(let current=file;current===source||current.startsWith(source+path.sep);current=path.dirname(current)){if(!stamps.has(current))stamps.set(current,sourceStamp(current));if(current===source)break;}};
 const context={source,semanticRecordOf,dataArtifactAddress};
 const load=position=>{const witness=witnessAt(position,{openSegmentReader,parseJournalWitness});if(witness.id!==position.original)throw new TypeError('original witness position differs from pass one');return selection(witness,position.kind,{...context,file:position.file});};
 // Snapshot all legacy custody metadata before the stream; packed backing bytes
 // and descriptions remain part of the original provider's source.
 for(const file of sourceFiles(path.join(source,'data/journals')))observe(file);
 for(const file of sourceFiles(path.join(source,'data/journals'))){if(!file.endsWith('.witnesses'))continue;
  const kind=path.basename(file).split('-admit-')[1]?.replace(/\.jsonl\.witnesses$/u,'');if(!kind)throw new TypeError('original segment kind unavailable');
  const ledger=file.replace(/\.witnesses$/u,'.admitted');
  if(fs.existsSync(ledger))for(const {record}of streamJsonLines(ledger))if(!Number.isSafeInteger(record.end)||record.end<0||record.end>fs.statSync(file).size)throw new TypeError('original segment lost admitted custody');
  let selected=0;
  if(['rpc','metroplat.clock','settlement-signal'].includes(kind)){report.sourceOnly[kind]=(report.sourceOnly[kind]??0)+1;continue;}
  for(const line of streamJsonLines(file,{openReader:openSegmentReader})){
   const witness=parseJournalWitness(line.record),item=selection(witness,kind,{...context,file});
   if(item?.unqualified){report.unqualifiedSources[item.unqualified]=(report.unqualifiedSources[item.unqualified]??0)+1;continue;}
   if(!item){report.sourceOnly[kind]=(report.sourceOnly[kind]??0)+1;continue;}
   if(!object(item.record)||!instant(item.at))throw new TypeError('selected original is not a dated object record');
   count(item.type).read++;selected++;
   if(maps.get('source',item.original)===undefined)maps.put('source',item.original,{file,offset:line.offset,length:line.length,kind,original:item.original});
   if(item.identity&&NI.test(item.identity)&&maps.get('identity',item.identity)===undefined)maps.put('identity',item.identity,item.original);
  }
  report.sourceSegments.push({path:path.relative(source,file),bytes:fs.statSync(file).size,logicalSha256:hashSource(file,{openReader:openSegmentReader}),selected});
 }
 const lookup=id=>maps.get('identity',id)??id;
 function rewrite(value){
  if(typeof value==='string'&&NI.test(value)){
   const original=lookup(value);if(maps.get('source',original)){const converted=convert(original);report.referencesRewritten++;return converted.id;}report.referencesLeft++;return value;
  }
  if(Array.isArray(value))return value.map(rewrite);
  if(object(value))return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rewrite(item)]));
  return value;
 }
 function convert(original){
  const done=maps.get('done',original);if(done)return done;
  if(active.has(original))throw new TypeError('original references contain a causal/content cycle');active.add(original);
  const position=maps.get('source',original);if(!position)throw new TypeError('selected original witness unavailable');
  const item=load(position);if(!item||item.unqualified)throw new TypeError('selected original changed meaning between passes');
  let record=rewrite(item.record);const named=[];
  for(const cause of item.namedCauses){const old=lookup(cause),prior=maps.get('source',old);if(!prior){report.causesDropped++;continue;}const held=convert(old);named.push(held.type===item.type?held.id:{type:held.type,id:held.id});}
  const causeKey=cause=>typeof cause==='string'?`${item.type} ${cause}`:`${cause.type} ${cause.id}`;
  const causes=[...new Map(named.map(cause=>[causeKey(cause),cause])).entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,cause])=>cause);
  if(item.claim&&causes.length)record={...record,cites:causes};
  const content=semanticAddress({type:item.type,thread:item.thread??null,record}).id,earlier=maps.get('content',content);let id;
  if(earlier){id=earlier;count(item.type).duplicates++;}
  else{
   if(item.thread){id=store.extend(output,item.type,item.thread,record,{causes,...(item.closed?{closed:true}:{})});count(item.type).heads++;}
   else {if(causes.length)record={...record,causes};id=store.put(output,item.type,record);}
   const writtenKey=semanticAddress({type:item.type,id}).id;
   if(maps.get('written',writtenKey)!==undefined)count(item.type).duplicates++;else{count(item.type).written++;maps.put('written',writtenKey,item.type);}
   maps.put('content',content,id);
   if(item.arena){const thread=record.thread??id,name=NI.test(thread)?store.threadName(thread):String(thread);const previous=store.readHead(output,item.type,name)?.frontier??[];
    const consumed=new Set(causes.filter(cause=>typeof cause==='string'));store.writeHead(output,item.type,name,{frontier:[...previous.filter(address=>!consumed.has(address)),id]});count(item.type).heads++;
   }
   if(item.thread){const headKey=semanticAddress({type:item.type,name:item.thread}).id,expected=maps.get('thread-count',headKey)??{type:item.type,name:item.thread,count:0};maps.put('thread-count',headKey,{...expected,count:expected.count+1});}
   if(item.log)store.append(output,item.type,item.type==='claim-session'?{at:item.at,thread:item.thread,of:id}:{at:item.at,of:id,...(record.verdict===undefined?{}:{verdict:record.verdict})});
  }
  const result={id,type:item.type};maps.put('done',original,result);if(item.identity&&NI.test(item.identity))maps.put('translated-identity',item.identity,result);
  active.delete(original);return result;
 }
 for(const {id}of maps.entries('source'))convert(id);
 for(const file of sourceFiles(path.join(source,'data/state/clock/last'))){if(!file.endsWith('.json'))continue;observe(file);const row=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!text(row.schedule)||!instant(row.ranAt)||typeof row.ok!=='boolean')throw new TypeError('original last-run record lacks current clock meaning');
  const record={at:row.ranAt,schedule:row.schedule,...(row.occurrence===undefined?{}:{occurrence:row.occurrence}),...(row.attempt===undefined?{}:{attempt:row.attempt}),ok:row.ok};
  const id=store.extend(output,'schedule-run',row.schedule,record),writtenKey=semanticAddress({type:'schedule-run',id}).id;count('schedule-run').read++;if(maps.get('written',writtenKey)!==undefined)count('schedule-run').duplicates++;else{count('schedule-run').written++;maps.put('written',writtenKey,'schedule-run');}count('schedule-run').heads++;
 }
 // Every converted record is read with the current writer's law. No payload is printed.
 for(const [type,expected]of Object.entries(report.types)){
  let found=0;for(const {address,record}of store.each(output,type)){if(!store.get(output,type,address)||semanticAddress(record).id!==address)throw new TypeError('converted record identity failed current receiving');found++;}
  if(found!==expected.written)throw new TypeError('converted record count differs from receipt');expected.verified=found;
  for(const {head}of store.heads(output,type))for(const step of store.walk(output,type,head.frontier,{limit:100_000}))if(step.missing||step.truncated)throw new TypeError('converted head is incomplete under current reader');
 }
 // Named thread records, as distinct rows, must remain reachable. Cross-thread
 // citations can make a walk larger; they do not inflate the original thread's count.
 for(const {value:expected}of maps.entries('thread-count')){
  // The table is append-only; only its final count for this thread is authoritative.
  const headKey=semanticAddress({type:expected.type,name:expected.name}).id;if(maps.get('thread-count',headKey).count!==expected.count)continue;
  const head=store.readHead(output,expected.type,expected.name);let reached=0;
  for(const step of store.walk(output,expected.type,head?.frontier??[],{limit:100_000}))if(step.record!==undefined&&step.type===expected.type&&(expected.type!=='claim-session'||step.record.thread===expected.name))reached++;
  if(reached<expected.count)throw new TypeError('converted thread lost distinct original rows');
 }
 assertSourceStamps(stamps);report.mainQualified=Object.values(report.unqualifiedSources).every(count=>count===0);
 report.originalsPreserved=true;report.mainSuppliers={oldRoot,newRoot};
 if(report.mainQualified)fs.rmSync(mapRoot,{recursive:true});
 return report;
}
