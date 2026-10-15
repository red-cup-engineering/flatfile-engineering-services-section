/** Complete a staged conversion through exact original readers and current writers.
 * A source filing date corroborates its thread name; it never replaces row time.
 * Original packet references without a usable inbox message stay explicit source
 * obstructions, with their original bytes/coordinates, never delivery claims.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {originalJournalFiles,streamJsonLines} from './conversion-buckets.mjs';
import {checkCurrentState} from './check-current-state.mjs';
const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.length>0;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function receiveOriginalDispositions({report,reportFile,binding,plan,inspect=false}){
 const expected=report.unqualifiedSources??{},allowed=['character-inbox-subject-unresolved','claim-thread-subject-unresolved'];
 assert.ok(Object.entries(expected).every(([key,count])=>count===0||allowed.includes(key)),'another source refusal requires its own receiver');
 const source=report.source,output=report.output;
 assert.equal(source,binding.source);assert.equal(output,path.join(path.dirname(reportFile),'candidate'));
 const oldRoot=fs.realpathSync(report.suppliers.oldStore),newRoot=fs.realpathSync(report.suppliers.newStore);
 const oldRequire=createRequire(path.join(oldRoot,'package.json')),newRequire=createRequire(path.join(newRoot,'package.json'));
 const load=file=>import(pathToFileURL(file).href),sup=(require,name)=>load(require.resolve(name));
 const {parseJournalWitness}=await load(path.join(oldRoot,'src/journal/event.mjs'));
 const {openSegmentReader}=await load(path.join(oldRoot,'src/journal/filesystem/segment-bytes.mjs'));
 const {journalDirectoryOf}=await load(path.join(oldRoot,'src/journal/store-root.mjs'));
 const manifest=JSON.parse(fs.readFileSync(path.join(oldRoot,'package.json'),'utf8'));
 const providers=['@red-cup-engineering/eavt-services-section','@red-cup-engineering/eavt'].filter(name=>Object.hasOwn(manifest.dependencies??{},name));assert.equal(providers.length,1);
 const {dataArtifactAddress}=await sup(oldRequire,providers[0]+'/data-artifact-address');
 const packetOf=value=>value?.kind==='metroplat.witness-packet-reference'?value:value?.kind==='metroplat.witness-row-obstruction'?value.packet:undefined;
 const validPacket=packet=>object(packet)&&packet.kind==='metroplat.witness-packet-reference'&&/^[a-f0-9]{64}$/u.test(packet.sha256)&&Number.isSafeInteger(packet.bytes)&&packet.bytes>=0&&packet.href==='blob:sha256:'+packet.sha256&&packet.mediaType==='application/json'&&text(packet.path)&&!path.isAbsolute(packet.path)&&!packet.path.split('/').includes('..');
 const retainPacket=packet=>{
  assert.ok(validPacket(packet),'original packet reference fails its producer contract');
  const file=path.join(journalDirectoryOf(source),packet.path);
  let bytes;try{const real=fs.realpathSync(file);assert.ok(real.startsWith(source+'/'));bytes=fs.readFileSync(real);}catch(error){if(['ENOENT','ENOTDIR'].includes(error.code))return {status:'original-packet-unavailable-at-declared-location'};throw error;}
  assert.equal(bytes.length,packet.bytes+1);assert.equal(bytes.at(-1),10);bytes=bytes.subarray(0,packet.bytes);assert.equal(sha(bytes),packet.sha256);
  return {status:'original-packet-retained',...keep(bytes,'application/json')};
 };
 const received=Object.fromEntries(allowed.map(key=>[key,0])),rows=[],unresolved=[];
 const claimCandidates=(kind,row,witness)=>{
  const [e,,v]=row,candidates=[e?.session,v?.caller?.surface,v?.boundary?.surface,witness.observation.seat?.subject,typeof e==='string'?e:undefined];
  for(const [pattern,prefix]of [[/^ni-sha-256-([A-Za-z0-9_-]{43})$/u,''],[/^actor-ni-sha-256-([A-Za-z0-9_-]{43})$/u,'actor:']]){const match=pattern.exec(kind);if(match)candidates.push(prefix+'ni:///sha-256;'+match[1]);}
  return [...new Set(candidates.filter(text))];
 };
 const match=(file,kind,row,witness,at)=>claimCandidates(kind,row,witness).filter(subject=>subject===kind||path.basename(dataArtifactAddress({root:source,tier:'log',encoding:'jsonl',at,action:subject,subject}).path)===path.basename(file).replace(/\.witnesses$/u,''));
 const deferred=new Set(binding.deferKinds??[]);
 for(const file of originalJournalFiles(source)){
  if(!file.endsWith('.witnesses'))continue;
  const kind=path.basename(file).split('-admit-')[1]?.replace(/\.jsonl\.witnesses$/u,'');if(deferred.has(kind))continue;
  for(const {record}of streamJsonLines(file,{openReader:openSegmentReader})){
   const raw=record.observation?.payload;if(!Array.isArray(raw)||raw.length!==4)continue;
   const inbox=kind==='character-inbox'&&packetOf(raw[2]);
   const claim=(raw[0]?.kind==='metroplat.claim-session'||kind?.startsWith('actor-')||kind?.startsWith('ni-sha-256-'))&&!kind?.startsWith('structured-work-intent-');
   if(!inbox&&!claim)continue;
   const witness=parseJournalWitness(record),row=witness.observation.payload;
   if(inbox){assert.ok(validPacket(packetOf(row[2])));rows.push({reason:allowed[0],kind,file,witness,row,packet:packetOf(row[2])});received[allowed[0]]++;}
   else if(match(file,kind,row,witness,String(row[3])).length!==1){
    const date=/^(\d{4}-\d{2}-\d{2})-/u.exec(path.basename(file))?.[1];
    const names=date?match(file,kind,row,witness,date):[];
    if(names.length!==1){
     unresolved.push({code:'source-thread-unresolved',original:witness.id,kind,file:path.relative(source,file),filingDate:date??null,
      rowClock:row[3],observationTime:witness.observation.time,entityKeys:object(row[0])?Object.keys(row[0]):[],
      valueKind:row[2]?.kind??null,valueKeys:object(row[2])?Object.keys(row[2]):[],
      candidates:claimCandidates(kind,row,witness).map(name=>name.slice(0,250)),witnessKeys:Object.keys(witness),observationKeys:Object.keys(witness.observation)});
     continue;
    }
    assert.ok(names[0].length<=200);
    rows.push({reason:allowed[1],kind,file,witness,row,thread:names[0],filingDate:date});received[allowed[1]]++;
   }
  }
 }
 // Read the whole remaining cohort before loading any current writer. Inspection
 // returns source identity/shape and packet custody without creating stores.
 if(inspect)return {source,expected,received,unresolvedCount:unresolved.length,unresolved:unresolved.slice(0,128),
  packets:rows.filter(item=>item.packet).map(item=>({original:item.witness.id,path:item.packet.path,bytes:item.packet.bytes,
   presentAtDeclaredLocation:fs.existsSync(path.join(journalDirectoryOf(source),item.packet.path))}))};
 assert.equal(unresolved.length,0,JSON.stringify({code:'original-source-cohort-unresolved',count:unresolved.length,rows:unresolved.slice(0,128)}));
 for(const reason of allowed)assert.equal(received[reason],expected[reason]??0,'the exact original rejected set must be received');
 const store=await load(path.join(newRoot,'src/store.mjs'));
 const {canonicalJson}=await sup(newRequire,'@red-cup-engineering/json-services-section/canonical');
 const {makeNiUri}=await sup(newRequire,'@red-cup-engineering/uri-services-section/ni-uri');
 const owner=createRequire(path.join(fs.realpathSync(plan.newOrganizing),'package.json'));
 const {immutableContentKey}=await sup(owner,'@red-cup-engineering/immutable-content-custody-service');
 const {createFileStoreSync}=await sup(owner,'@red-cup-engineering/immutable-content-custody-service/file-store');
 const custody=createFileStoreSync(path.join(output,'data','custody'));
 const keep=(bytes,mediaType)=>{const body=makeNiUri(bytes),key=immutableContentKey(body);custody.putIfAbsent(key,{body:bytes,mediaType});const held=custody.get(key);assert.ok(held&&Buffer.from(held.body).equals(bytes));return {body,mediaType,bytes:bytes.length};};
 const content=value=>{const bytes=Buffer.from(canonicalJson(value));return bytes.length<=32768?value:keep(bytes,'application/json');};
 const previousTypes=structuredClone(report.types),affected=new Set();
 for(const item of rows){
  const {witness,row,kind}=item;let type,id;
  if(item.packet){
   type='source-obstruction';const packet=retainPacket(item.packet);
   id=store.put(output,type,{kind:'original-producer-packet-reference',source:witness.id,sourceKind:kind,packet:item.packet,bodyDisposition:packet,
    content:content({sourceFile:path.relative(source,item.file),sourceRow:row,sourceWitness:witness})});
  }else{
   type='claim-session';const [e,a,v,t]=row,originalCites=witness.observation.causes??[];
   const held=[];for(const cause of originalCites)if(NI.test(cause))for(const candidateType of Object.keys(report.types))if(store.get(output,candidateType,cause)){held.push({type:candidateType,id:cause});break;}
   const record={e,a,v,t,thread:item.thread,...(witness.observation.seat===undefined?{}:{seat:witness.observation.seat}),...(originalCites.length?{cites:originalCites}:{})};
   id=store.extend(output,type,item.thread,record,{causes:held});
  }
  assert.ok(store.get(output,type,id));affected.add(type);
  store.put(output,'source-conversion',{kind:'original-source-disposition',source:witness.id,converted:{type,id},reason:item.reason,
   content:content({sourceFile:path.relative(source,item.file),filingDate:item.filingDate??null,sourceRow:row,sourceWitness:witness})});affected.add('source-conversion');
 }
 for(const type of affected){
  let written=0;for(const _ of store.each(output,type,{strict:true}))written++;
  const prior=previousTypes[type]??{read:0,written:0,duplicates:0,heads:0,verified:0};
  const reads=type==='source-conversion'?rows.length:type==='source-obstruction'?received[allowed[0]]:received[allowed[1]];
  assert.ok(written>=prior.written&&written-prior.written<=reads);
  report.types[type]={...prior,read:prior.read+reads,written,duplicates:prior.duplicates+reads-(written-prior.written),heads:[...store.heads(output,type,{strict:true})].length,verified:written};
 }
 const nativePlan={version:1,newStore:newRoot,newOrganizing:plan.newOrganizing,bindings:[{...binding,target:output,types:Object.keys(report.types)}]};
 await checkCurrentState(nativePlan);
 const originalBytes=fs.readFileSync(reportFile),retained=path.join(path.dirname(reportFile),'conversion.before-source-dispositions.json');
 if(!fs.existsSync(retained))fs.writeFileSync(retained,originalBytes,{flag:'wx',mode:0o600});
 report.sourceDispositionReceiving={version:1,originalReportSha256:sha(fs.readFileSync(retained)),received,rows:rows.length,operatingPayloadsInvented:0,originalTimesReplaced:0};
 for(const reason of allowed)report.unqualifiedSources[reason]=(expected[reason]??0)-received[reason];
 report.mainQualified=Object.values(report.unqualifiedSources).every(count=>count===0);
 report.qualified=report.mainQualified&&report.missingBodies.length===0&&(report.queue.originalOnly?.length??0)===0;
 assert.equal(report.qualified,true);
 const temporary=reportFile+'.received';fs.writeFileSync(temporary,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temporary,reportFile);
 return report;
}
