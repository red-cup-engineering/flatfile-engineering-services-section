/** One-time branch-only main-world converter. Original custody is never changed.
 * Current receiving forms, not old witness wrappers, govern the selected records.
 * See store-conversion.md and store-migration-map.md; no runtime legacy bridge. */
import { getTypedMark, putTypedMark } from "../src/typed-mark-store.mjs";
import fs from 'node:fs';
import path from 'node:path';
import {originalJournalFiles,createBucketMap,streamJsonLines,sourceFiles,sourceStamp,assertSourceStamps,hashSource,witnessAt} from './conversion-buckets.mjs';

const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.length>0;

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
  // Old journalFeedPath calls the original formula with kind in BOTH coordinates.
  const described=dataArtifactAddress({root:source,tier:'log',encoding:'jsonl',at:String(row[3]),action:subject,subject});
  return path.basename(described.path)===path.basename(file).replace(/\.witnesses$/u,'');
 });
 return matches.length===1?matches[0]:undefined;
}

function selection(witness,kind,context,semantic=context.semanticRecordOf(witness,kind)){
 const row=witness.observation.payload;if(!Array.isArray(row)||row.length!==4)return;
 const [e,a,v,t]=row,plain={e,a,v,t},value=semantic?.record;
 const sourceWitness={id:witness.id,kind,sources:witness.sources??[],observation:{address:witness.observation.address??null,claim:witness.observation.claim??null,time:witness.observation.time??null,causes:witness.observation.causes??[],seat:witness.observation.seat??null,referencedArtifacts:witness.observation.referencedArtifacts??[]}};
 const common={original:witness.id,identity:semantic?.id,at:semantic?.recordedAt??witness.observation.time,namedCauses:witness.observation.causes??[],
  epistemicSource:Boolean(semantic),sourceKind:kind,sourceCategory:semantic?.category??null,sourceRecordedAt:semantic?.recordedAt??null,
  sourceTold:semantic?.told??null,sourceEvent:semantic?.event??null,sourceOrigin:semantic?.origin??null,
  sourceCauses:semantic?.causes??witness.observation.causes??[],sourceWitness,sourceRow:plain,observedAt:witness.observation.time??semantic?.recordedAt};
 if(common.epistemicSource&&!context.isAbsoluteSeavtClock(common.observedAt))return {unqualified:'source-observation-clock-unavailable'};
 if((object(e)&&e.kind==='metroplat.claim-session')||kind.startsWith('structured-work-intent-')||kind.startsWith('actor-')||kind.startsWith('ni-sha-256-')){
  const thread=claimSubject({...context,kind,row,witness});if(thread===undefined)return {unqualified:'claim-thread-subject-unresolved'};
  // Current claim-session consumers address this exact name; hashing would invent a new subject.
  if(thread.length>200)return {...common,originalOnly:'legacy-subject-exceeds-current-name-law'};
  // Current FeltOS dispatch and governance readers fold native thread heads.
  // Their t may be a source/item coordinate, not an instant. Preserve it as
  // the row says it; no current consumer requires a dated claim-session log.
  return {...common,type:'claim-session',thread,claim:true,record:{...plain,thread,...(witness.observation.seat===undefined?{}:{seat:witness.observation.seat})}};
 }
 // These source records carry an epistemic reading, not present-day authority.
 // Receive their proposition, source event and four-valued telling in the
 // current Metrologic + SignCell carriers; never place an old assertion in the
 // modern capability-authority thread.
 if(['knowing.claims','capability-assertions','rpc','metroplat.clock','settlement-signal'].includes(kind)){
  if(!context.isAbsoluteSeavtClock(common.observedAt))return {unqualified:'source-observation-clock-unavailable'};
  return {...common,type:'semantic-claim',record:object(value)?value:{payload:row??null},semanticSource:true};
 }
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
 if(kind==='work-arena-move'&&object(value)){
  if(!text(value.thread??value.id))return {unqualified:'work-arena-thread-unresolved'};
  return {...common,type:'work-arena-move',record:value,arena:true};
 }
 if(kind==='work-outcome'&&object(value))return {...common,type:'work-outcome',record:value,log:true};
 if(kind==='561-group.primary-system-health'&&semantic?.category==='primary-system-health'&&object(value))return {...common,type:'primary-system-health',record:{...value,at:semantic.recordedAt,told:semantic.told,clockScope:'historical original pulse issue clock; response availability was not recorded'},log:true,health:true};
 if(kind==='peer-liveness'&&object(value)&&text(value.peer))return {...common,type:'peer-liveness',record:value,thread:value.peer};
 if(kind==='enterprise'&&semantic&&/^(?:contact|order|party|resource|cost|settlement|signature|bid|control)$/u.test(semantic.category))return {...common,type:'enterprise-'+semantic.category,record:value};
 if(kind==='anchored-findings'&&object(value)&&text(value.subject))return {...common,type:'anchored-finding',record:value,thread:value.subject};
 if(kind==='codex-tasks'&&object(value)&&text(value.id))return {...common,type:'codex-task',record:value,thread:value.id};
 if(kind==='lean-checks'&&object(value)&&text(value.id))return {...common,type:'lean-check',record:value,thread:value.id};
 if(kind==='inference-receiving-attempt'&&object(value))return {...common,type:'inference-receiving-attempt',record:value};
}

/** All supplier functions come from independently selected, fabricated providers.
 * Temporary maps contain byte positions and addresses, never an in-memory store table. */
export async function convertMainWorld({deferredKinds=new Set(),source,output,oldRoot,newRoot,store,report,parseJournalWitness,openSegmentReader,semanticRecordOf,niBucketPath,semanticAddress,dataArtifactAddress,clockLastSource,admit,claimType,evidenceType,createSignClaim,Mark,MarkType,createTypedMark,admitTypedMark,referenceOf,sourceTermToJson,seavtOfSignCell,signCellOfSeavt,isAbsoluteSeavtClock}){
 if(!store||![parseJournalWitness,openSegmentReader,semanticRecordOf,niBucketPath,semanticAddress].every(fn=>typeof fn==='function'))throw new TypeError('exact original readers and current writers required');
 if(![admit,createSignClaim,Mark,createTypedMark,admitTypedMark,referenceOf,sourceTermToJson,seavtOfSignCell,signCellOfSeavt,isAbsoluteSeavtClock].every(fn=>typeof fn==='function')||!claimType||!evidenceType||!MarkType)throw new TypeError('current Metrologic and SignCell receivers required');
 const mapRoot=path.join(output,'.conversion-main'),maps=createBucketMap(mapRoot,niBucketPath),stamps=new Map(),active=new Set();
 fs.mkdirSync(mapRoot,{recursive:true,mode:0o700});
 report.mainConsumers={claimSession:'feltos/src/work/claim-session-store.mjs',capabilities:'computer-system-engine/src/rpc/capability-assertions.mjs',offices:'metroplat/src/offices.mjs',bodies:'metroplat/src/bodies.mjs',clock:'organizing/src/work/recurring.mjs',epistemic:'metrologic claim/evidence + SignCell'};
 report.unqualifiedSources??={};report.sourceOnly??={};report.sourceSegments??=[];report.types??={};
 report.referencesRewritten??=0;report.referencesLeft??=0;report.causesDropped??=0;
 report.originalOnlyDispositions={file:'.conversion-original-only-dispositions.jsonl',count:0,reasons:{}};
 report.referenceDispositions={file:'.conversion-reference-dispositions.jsonl',count:0,unresolvedNamedCitations:0};
 const disposition=(item,reference,reason,role)=>{fs.appendFileSync(path.join(output,report.referenceDispositions.file),JSON.stringify({original:item.original,reference,type:item.type,thread:item.thread??null,originalKind:maps.get('original-kind',maps.get('identity',reference)??reference)??null,reason,role})+'\n',{mode:0o600});report.referenceDispositions.count++;};
 const count=type=>report.types[type]??={read:0,written:0,duplicates:0,heads:0,verified:0};
 const clockLastRoot=clockLastSource??path.join(source,'data/state/clock/last');
 const observe=file=>{const root=[source,clockLastRoot].find(root=>file===root||file.startsWith(root+path.sep));if(root===undefined)throw new TypeError('original observation outside selected custody');for(let current=file;;current=path.dirname(current)){if(!stamps.has(current))stamps.set(current,sourceStamp(current));if(current===root)break;}};
 const context={source,semanticRecordOf,dataArtifactAddress,isAbsoluteSeavtClock};
 const load=position=>{const witness=witnessAt(position,{openSegmentReader,parseJournalWitness});if(witness.id!==position.original)throw new TypeError('original witness position differs from pass one');return selection(witness,position.kind,{...context,file:position.file});};
 // Snapshot all legacy custody metadata before the stream; packed backing bytes
 // and descriptions remain part of the original provider's source.
 // The original provider used both layouts during its lifetime. They are
 // one-time inputs only; neither layout becomes a current runtime reader.
 function* originalFiles(){yield* originalJournalFiles(source,{observe});}
 for(const file of originalFiles())observe(file);
 for(const file of originalFiles()){if(!file.endsWith('.witnesses'))continue;
  const kind=path.basename(file).split('-admit-')[1]?.replace(/\.jsonl\.witnesses$/u,'');if(!kind)throw new TypeError('original segment kind unavailable');
  const ledger=file.replace(/\.witnesses$/u,'.admitted');
  if(fs.existsSync(ledger))for(const {record}of streamJsonLines(ledger))if(!Number.isSafeInteger(record.end)||record.end<0||record.end>fs.statSync(file).size)throw new TypeError('original segment lost admitted custody');
  let selected=0;
  for(const line of streamJsonLines(file,{openReader:openSegmentReader})){
   if(NI.test(line.record.id)&&maps.get('original-kind',line.record.id)===undefined)maps.put('original-kind',line.record.id,kind);
   if(deferredKinds.has(kind)){report.deferredKinds??={};report.deferredKinds[kind]=(report.deferredKinds[kind]??0)+1;report.sourceOnly[kind]=(report.sourceOnly[kind]??0)+1;continue;}
   const witness=parseJournalWitness(line.record),semantic=semanticRecordOf(witness,kind);
   // The identity is witnessed even when its original kind is not a current consumer.
   if(semantic?.id&&NI.test(semantic.id)&&maps.get('identity',semantic.id)===undefined)maps.put('identity',semantic.id,witness.id);
   // Pass one already received the original projection for identity mapping.
   // Pass two still reopens and re-admits its exact original witness.
   const item=selection(witness,kind,{...context,file},semantic??null);
   if(item?.originalOnly){report.sourceOnly[kind]=(report.sourceOnly[kind]??0)+1;
    fs.appendFileSync(path.join(output,report.originalOnlyDispositions.file),JSON.stringify({original:witness.id,kind,reason:item.originalOnly})+'\n',{mode:0o600});
    report.originalOnlyDispositions.count++;report.originalOnlyDispositions.reasons[item.originalOnly]=(report.originalOnlyDispositions.reasons[item.originalOnly]??0)+1;continue;}
   if(item?.unqualified){report.unqualifiedSources[item.unqualified]=(report.unqualifiedSources[item.unqualified]??0)+1;continue;}
   if(!item){report.sourceOnly[kind]=(report.sourceOnly[kind]??0)+1;continue;}
   if(!object(item.record))throw new TypeError('selected original is not an object record');
 if(item.log&&!isAbsoluteSeavtClock(item.at))throw new TypeError('selected temporal consumer lacks a current absolute source clock');
   if(!item.semanticSource)count(item.type).read++;selected++;
   if(maps.get('source',item.original)===undefined)maps.put('source',item.original,{file,offset:line.offset,length:line.length,kind,original:item.original});
   if(item.identity&&NI.test(item.identity)&&maps.get('identity',item.identity)===undefined)maps.put('identity',item.identity,item.original);
  }
  report.sourceSegments.push({path:path.relative(source,file),bytes:fs.statSync(file).size,logicalSha256:hashSource(file,{openReader:openSegmentReader}),selected});
 }
 const lookup=id=>maps.get('identity',id)??id;
 const putCurrent=(type,record)=>{
  const id=store.put(output,type,record),countForType=count(type),writtenKey=semanticAddress({type,id}).id;
  if(maps.get('written',writtenKey)!==undefined)countForType.duplicates++;
  else{countForType.written++;maps.put('written',writtenKey,type);}
  return id;
 };
 const resolveTypedMark=reference=>getTypedMark(store,output,reference,MarkType,admitTypedMark);
 function receiveSemanticSource(item,original){
  const sides=item.sourceTold&&typeof item.sourceTold.for==='boolean'&&typeof item.sourceTold.against==='boolean'
   ? item.sourceTold : {for:false,against:false};
  const provenance=[...new Set([item.original,...item.sourceCauses,item.sourceOrigin].filter(text))];
  const rawClaim=item.sourceKind==='knowing.claims'&&object(item.record)?item.record:null;
  let claimRecord,subjectTerm,objectTerm,predicate;
  if(rawClaim){
   const {told:_oldTold,...candidate}=rawClaim;
   const prior=Array.isArray(candidate.provenance)?candidate.provenance.filter(text):[];
   const admitted=admit(claimType,{...candidate,provenance:[...new Set([...prior,...provenance])]});
   if(admitted?.ok){claimRecord=admitted.value;subjectTerm=claimRecord.subject;objectTerm=claimRecord.object;predicate=claimRecord.predicate;}
  }
  const evidenceRecord={kind:'evidence',source:item.original,observedAt:item.observedAt,
   content:{sourceKind:item.sourceKind,sourceCategory:item.sourceCategory,sourceRecordedAt:item.sourceRecordedAt,
    sourceEvent:item.sourceEvent,sourceOrigin:item.sourceOrigin,sourceTold:item.sourceTold??null,
    sourceCauses:item.sourceCauses,sourceWitness:item.sourceWitness,sourceRow:item.sourceRow,record:item.record},provenance};
  const evidenceAdmitted=admit(evidenceType,evidenceRecord);
  if(!evidenceAdmitted?.ok)throw new TypeError('original source evidence fails current Metrologic receiving');
  const evidenceId=putCurrent('evidence',evidenceAdmitted.value);
  const witnessRef={id:evidenceId,type:'evidence'};
  const putTerm=term=>{
   const typed=createTypedMark(MarkType,Mark(term));
   if(!typed?.ok)throw new TypeError('original EAVT term fails current opaque typed-mark receiving');
   const reference=putTypedMark(putCurrent,typed.value,referenceOf);
   const recovered=resolveTypedMark(reference);
   if(recovered.id!==typed.value.id)throw new TypeError('stored typed-mark did not re-admit at its SignCell identity');
   return reference;
  };
  let subjectRef,objectRef;
  if(claimRecord){subjectRef=putTerm(subjectTerm);objectRef=putTerm(objectTerm);}
  else if(item.sourceRow&&Object.hasOwn(item.sourceRow,'e')&&Object.hasOwn(item.sourceRow,'a')&&Object.hasOwn(item.sourceRow,'v')){
   const [entity,predicateTerm,value]=[item.sourceRow.e,item.sourceRow.a,item.sourceRow.v];
   subjectRef=putTerm(sourceTermToJson(entity));objectRef=putTerm(sourceTermToJson(value));
   predicate=sourceTermToJson(predicateTerm);
  }
  if(!claimRecord){
   if(!subjectRef||!objectRef||!text(predicate)){
    // Preserve the original expression, source charge, and provenance as
    // evidence. With no admitted proposition coordinates, do not transfer its
    // charge to a fabricated relation.
    for(const type of ['evidence'])count(type).read++;
    const result={id:evidenceId,type:'evidence'};
    if(item.identity&&NI.test(item.identity))maps.put('translated-identity',item.identity,result);
    return result;
   }
   claimRecord={kind:'claim',subject:subjectRef.id,predicate,object:objectRef,provenance};
   const admitted=admit(claimType,claimRecord);if(!admitted?.ok)throw new TypeError('source proposition or explicit ambiguity fails current Metrologic claim receiving');
   claimRecord=admitted.value;
  }
  const claimId=putCurrent('claim',claimRecord);
  const created=createSignClaim({subject:subjectRef,predicate,object:objectRef,
   for:sides.for?[witnessRef]:[],against:sides.against?[witnessRef]:[]});
  if(!created?.ok)throw new TypeError('original four-valued telling fails current SignCell receiving');
  const semanticCell=created.value;
  resolveTypedMark(subjectRef);resolveTypedMark(objectRef);
  const cellId=putCurrent('semantic-claim',semanticCell);
  const projection=seavtOfSignCell(semanticCell,item.observedAt);
  const recovered=signCellOfSeavt(projection);
  if(semanticAddress(recovered).id!==semanticAddress(semanticCell).id)throw new TypeError('current SignCell/SEAVT post-bind receiving changed the original cell');
  putCurrent('signcell-seavt',projection);
  for(const type of ['claim','evidence','semantic-claim','signcell-seavt'])count(type).read++;
  const result={id:cellId,type:'semantic-claim'};
  if(item.identity&&NI.test(item.identity))maps.put('translated-identity',item.identity,result);
  return result;
 }
 function rewrite(value,item){
  if(typeof value==='string'&&NI.test(value)){
   const original=lookup(value);if(maps.get('source',original)){const converted=convert(original);report.referencesRewritten++;return converted.id;}report.referencesLeft++;disposition(item,value,maps.get('original-kind',original)?'original-kind-not-converted':'external-or-unresolved-original-reference','record-reference');return value;
  }
  if(Array.isArray(value))return value.map(value=>rewrite(value,item));
  if(object(value))return Object.fromEntries(Object.entries(value).map(([key,value])=>[key,rewrite(value,item)]));
  return value;
 }
 function convert(original){
  const done=maps.get('done',original);if(done)return done;
  if(active.has(original))throw new TypeError('original references contain a causal/content cycle');active.add(original);
  const position=maps.get('source',original);if(!position)throw new TypeError('selected original witness unavailable');
  const item=load(position);if(!item||item.unqualified)throw new TypeError('selected original changed meaning between passes');
  if(item.semanticSource){const result=receiveSemanticSource(item,original);maps.put('done',original,result);active.delete(original);return result;}
  // Arena ids, thread relations, editions and evidence locators belong to the
  // move's domain content. The native arena writer preserves that content;
  // only the observation's separately typed witness causes change custody.
  let record=item.arena?item.record:rewrite(item.record,item);const named=[],unresolvedCites=[];
  for(const cause of item.namedCauses){const old=lookup(cause),prior=maps.get('source',old);if(!prior){report.causesDropped++;const originalKind=maps.get('original-kind',old);disposition(item,cause,originalKind?'original-kind-not-converted':'original-cause-unavailable',item.claim?'named-claim-citation':'cause');
    if(item.claim){unresolvedCites.push(cause);report.referenceDispositions.unresolvedNamedCitations++;if(!originalKind)report.unqualifiedSources['named-claim-citation-unavailable']=(report.unqualifiedSources['named-claim-citation-unavailable']??0)+1;}continue;}
   const held=convert(old);named.push(held.type===item.type?held.id:{type:held.type,id:held.id});}
  const causeKey=cause=>typeof cause==='string'?`${item.type} ${cause}`:`${cause.type} ${cause.id}`;
  const causes=[...new Map(named.map(cause=>[causeKey(cause),cause])).entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,cause])=>cause);
  if(item.claim&&(causes.length||unresolvedCites.length))record={...record,cites:[...causes,...unresolvedCites]};
  const content=semanticAddress({type:item.type,thread:item.thread??null,record}).id,earlier=maps.get('content',content);let id;
  if(earlier){id=earlier;count(item.type).duplicates++;}
  else{
   if(item.thread){id=store.extend(output,item.type,item.thread,record,{causes,...(item.closed?{closed:true}:{})});count(item.type).heads++;}
   else {if(causes.length)record={...record,causes};id=store.put(output,item.type,record);}
   const writtenKey=semanticAddress({type:item.type,id}).id;
   if(maps.get('written',writtenKey)!==undefined)count(item.type).duplicates++;else{count(item.type).written++;maps.put('written',writtenKey,item.type);}
   maps.put('content',content,id);
   if(item.arena){const thread=record.thread??record.id,name=NI.test(thread)?store.threadName(thread):String(thread);const previous=store.readHead(output,item.type,name)?.frontier??[];
    const consumed=new Set(causes.filter(cause=>typeof cause==='string'));store.writeHead(output,item.type,name,{frontier:[...previous.filter(address=>!consumed.has(address)),id]});count(item.type).heads++;
    const headKey=semanticAddress({type:item.type,name}).id,expected=maps.get('thread-count',headKey)??{type:item.type,name,thread,count:0};maps.put('thread-count',headKey,{...expected,count:expected.count+1});
   }
   if(item.thread){const headKey=semanticAddress({type:item.type,name:item.thread}).id,expected=maps.get('thread-count',headKey)??{type:item.type,name:item.thread,count:0};maps.put('thread-count',headKey,{...expected,count:expected.count+1});}
   if(item.log)store.append(output,item.type,item.type==='claim-session'?{at:item.at,thread:item.thread,of:id}:{at:item.at,of:id,...(record.verdict===undefined?{}:{verdict:record.verdict}),...(item.health?{system:record.system,charge:record.charge,was:record.was}:{})});
  }
  const result={id,type:item.type};maps.put('done',original,result);if(item.epistemicSource)receiveSemanticSource(item,original);if(item.identity&&NI.test(item.identity))maps.put('translated-identity',item.identity,result);
  active.delete(original);return result;
 }
 for(const {id}of maps.entries('source'))convert(id);
 if(fs.existsSync(clockLastRoot))observe(clockLastRoot);
 for(const file of sourceFiles(clockLastRoot)){if(!file.endsWith('.json'))continue;observe(file);const row=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!text(row.schedule)||typeof row.ok!=='boolean')throw new TypeError('original last-run record lacks current clock meaning');
  const record={at:row.ranAt,schedule:row.schedule,...(row.occurrence===undefined?{}:{occurrence:row.occurrence}),...(row.attempt===undefined?{}:{attempt:row.attempt}),ok:row.ok};
  if(!isAbsoluteSeavtClock(row.ranAt))throw new TypeError('original last-run record lacks a current absolute source clock');
  const id=store.extend(output,'schedule-run',row.schedule,record),writtenKey=semanticAddress({type:'schedule-run',id}).id;count('schedule-run').read++;if(maps.get('written',writtenKey)!==undefined)count('schedule-run').duplicates++;else{count('schedule-run').written++;maps.put('written',writtenKey,'schedule-run');}count('schedule-run').heads++;
 }
 // Every converted record is read with the current writer's law. No payload is printed.
 for(const [type,expected]of Object.entries(report.types)){
  let found=0;for(const {address,record}of store.each(output,type)){if(!store.get(output,type,address)||semanticAddress(record).id!==address)throw new TypeError('converted record identity failed current receiving');found++;}
  if(type==='typed-mark')for(const {address,record}of store.each(output,type)){const recovered=getTypedMark(store,output,{id:address,type:record.type},MarkType,admitTypedMark);if(recovered.id!==address)throw new TypeError('stored typed-mark identity basis fails its current declared receiver');}
  if(type==='semantic-claim')for(const {record}of store.each(output,type)){resolveTypedMark(record.subject);resolveTypedMark(record.object);}
  if(type==='signcell-seavt')for(const {record}of store.each(output,type)){const recovered=signCellOfSeavt(record);if(!store.get(output,'semantic-claim',semanticAddress(recovered).id))throw new TypeError('stored SignCell projection does not bind to its current semantic claim');resolveTypedMark(recovered.subject);resolveTypedMark(recovered.object);}
  if(found!==expected.written)throw new TypeError('converted record count differs from receipt');expected.verified=found;
  for(const {head}of store.heads(output,type))for(const step of store.walk(output,type,head.frontier,{limit:100_000}))if(step.missing||step.truncated)throw new TypeError('converted head is incomplete under current reader');
 }
 // Named thread records, as distinct rows, must remain reachable. Cross-thread
 // citations can make a walk larger; they do not inflate the original thread's count.
 for(const {value:expected}of maps.entries('thread-count')){
  // The table is append-only; only its final count for this thread is authoritative.
  const headKey=semanticAddress({type:expected.type,name:expected.name}).id;if(maps.get('thread-count',headKey).count!==expected.count)continue;
  const head=store.readHead(output,expected.type,expected.name);let reached=0;
  for(const step of store.walk(output,expected.type,head?.frontier??[],{limit:100_000})){
   if(step.missing||step.truncated)throw new TypeError('converted thread is incomplete under current reader');
   if(step.record!==undefined&&step.type===expected.type&&(expected.type==='claim-session'?step.record.thread===expected.name:expected.type==='work-arena-move'?(step.record.thread??step.record.id)===expected.thread:true))reached++;
  }
  if(reached<expected.count)throw new TypeError('converted thread lost distinct original rows');
 }
 assertSourceStamps(stamps);report.mainQualified=Object.values(report.unqualifiedSources).every(count=>count===0);
 report.sourceOnlyDisposition='Unmapped kinds and clock reservation files remain in original custody. Selected epistemic rows also receive Metrologic claim/evidence and SignCell projections; owner-specific records remain with their current consumers, and no old capability assertion becomes authority or old clock outcome becomes an actionable schedule run.';
 report.originalsPreserved=true;report.mainSuppliers={oldRoot,newRoot,clockLastSource:clockLastRoot};
 if(report.mainQualified)fs.rmSync(mapRoot,{recursive:true});
 return report;
}
