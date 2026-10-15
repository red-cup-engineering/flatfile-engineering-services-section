/** Isolated native-to-native receiving proposal. No host binding or activation.
 * Input contract: native journal-custody 13bca0b8 and its three record types.
 * Originals remain in place. The selected complete source is copied before its
 * inbox occurrences are received with explicit order and exact body custody. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createBucketMap,sourceStamp,assertSourceStamps} from './conversion-buckets.mjs';
const INBOX='activitypub-inbox',OUTBOX='activitypub-outbox',FOLLOWERS='activitypub-follower';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireText=value=>{if(typeof value!=='string'||value.length===0)throw new TypeError('explicit native receiving path required');return value;};
const lexical=(a,b)=>a<b?-1:a>b?1:0;
const exactOrdinal=n=>{if(!Number.isSafeInteger(n)||n<0)throw new RangeError('native receiving order must be a nonnegative safe integer');return n;};
export async function receiveNativeActivityPub({source,output,sourceStoreRoot,sourceActivitypubRoot,targetStoreRoot,targetActivitypubRoot}){
 source=fs.realpathSync(requireText(source));output=path.resolve(requireText(output));
 let ancestor=path.dirname(output),tail=[];while(!fs.existsSync(ancestor)){tail.unshift(path.basename(ancestor));ancestor=path.dirname(ancestor);}output=path.join(fs.realpathSync(ancestor),...tail,path.basename(output));
 if(fs.existsSync(output)||source===output||output.startsWith(source+path.sep)||source.startsWith(output+path.sep))throw new TypeError('separate nonnested absent candidate required');
 if(fs.statSync(source).dev!==fs.statSync(ancestor).dev)throw new TypeError('same-volume candidate required');
 if(activityPubSourceFormat({source,sourceStoreRoot,sourceActivitypubRoot})!=='native-activitypub-13bca0b8')throw new TypeError('declared native representation required');
 const load=file=>import(pathToFileURL(file).href),supplier=async(root,name)=>load(createRequire(path.join(root,'package.json')).resolve(name));
 const sourceCore=fs.readFileSync(path.join(requireText(sourceStoreRoot),'src/store-core.mjs'));
 if(sha(sourceCore)!=='6b6aff7436268affc37ba636f50924d326d4971bf9384b0b5b51805104e06d6d')throw new TypeError('exact declared native source store required');
 const original=await load(path.join(sourceStoreRoot,'src/store.mjs')),store=await load(path.join(requireText(targetStoreRoot),'src/store.mjs'));
 const sourceJournal=path.join(requireText(sourceActivitypubRoot),'src/journal-custody.mjs'),sourceBytes=fs.readFileSync(sourceJournal);
 if(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+sourceBytes.length+'\0'),sourceBytes])).digest('hex')!=='13bca0b8ea67de7841684dddc1fab7e9a77eb13d')throw new TypeError('exact declared native source ActivityPub provider required');
 const targetAp=await load(path.join(requireText(targetActivitypubRoot),'src/journal-custody.mjs'));
 for(const name of ['activityPubRequestHead','activityPubReplyHead','compareActivityPubReplyRows','activityPubReplyCoordinates'])if(typeof targetAp[name]!=='function')throw new TypeError('paired correlation consumer unavailable');
 const {semanticAddress}=await supplier(targetStoreRoot,'@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address');
 const {niBucketPath}=await supplier(targetStoreRoot,'@red-cup-engineering/computer-content-address-engineering-services-section/ni-path');
 const {canonicalJson}=await supplier(targetStoreRoot,'@red-cup-engineering/json-services-section/canonical');
 const {createFileStoreSync}=await supplier(sourceActivitypubRoot,'@red-cup-engineering/immutable-content-custody-service/file-store');
 const {immutableContentKey}=await supplier(sourceActivitypubRoot,'@red-cup-engineering/immutable-content-custody-service');
 const {verifyNiUri}=await supplier(sourceStoreRoot,'@red-cup-engineering/uri-services-section/ni-uri');
 const bodies=createFileStoreSync(path.join(source,'custody'));
 const activityOf=record=>{const held=bodies.get(immutableContentKey(record.activityNi));if(held===null||held.mediaType!=='application/json'||!Number.isSafeInteger(record.activityBytes)||record.activityBytes<0||held.body.length!==record.activityBytes||!verifyNiUri(held.body,record.activityNi))throw new TypeError('original native body differs from exact custody');const value=JSON.parse(Buffer.from(held.body).toString('utf8'));if(!Buffer.from(canonicalJson(value)).equals(Buffer.from(held.body)))throw new TypeError('noncanonical native body');return value;};
 const stamps=new Map(),observe=p=>stamps.set(p,sourceStamp(p));
 const observeTree=p=>{const stat=fs.lstatSync(p);if(!stat.isDirectory()&&!stat.isFile())throw new TypeError('native source custody requires ordinary files and directories');observe(p);if(stat.isDirectory())for(const name of fs.readdirSync(p))observeTree(path.join(p,name));};observeTree(source);
 // Do not silently rewrite an undeclared source format or cross-type graph.
 const recordTypes=path.join(source,'data/records');if(fs.existsSync(recordTypes))for(const entry of fs.readdirSync(recordTypes))if(![INBOX,OUTBOX,FOLLOWERS].map(x=>x+'-records').includes(entry))throw new TypeError('unselected native ActivityPub record type');
 if(fs.existsSync(path.join(source,'.conversion-correlation')))throw new TypeError('interrupted correlation candidate is not an original native source');
 const logs=path.join(source,'data/logs');if(fs.existsSync(logs)&&fs.readdirSync(logs).length)throw new TypeError('unselected native ActivityPub log references');
 for(const type of [INBOX,OUTBOX])for(const {head}of original.heads(source,type,{strict:true})){
  if(head.closed===true||head.frontier.length!==1||typeof head.frontier[0]!=='string')throw new TypeError('unsupported native source head state');
  if(original.get(source,type,head.frontier[0])===undefined)throw new TypeError('source head names unavailable custody');
 }
 fs.cpSync(source,output,{recursive:true,preserveTimestamps:true,errorOnExist:true,force:false});
 const mapsRoot=path.join(output,'.conversion-correlation'),maps=createBucketMap(mapsRoot,niBucketPath),keyOf=value=>semanticAddress(value).id;
 const report={sourceFormat:'native-activitypub-13bca0b8',source,output,sourceProviderBlob:'13bca0b8ea67de7841684dddc1fab7e9a77eb13d',sourceStoreCoreSha256:sha(sourceCore),targetProviderSha256:sha(fs.readFileSync(path.join(targetActivitypubRoot,'src/journal-custody.mjs'))),inboxOccurrences:0,uniqueReceipts:0,requestHeads:0,replyHeads:0,originalsPreserved:true,qualified:false};
 let ordinal=0;
 for(const {address,record}of original.each(source,INBOX,{strict:true})){
  exactOrdinal(ordinal);if(record.sourceOrder!==undefined||record.replyOrder!==undefined||record.causes!==undefined)throw new TypeError('source inbox is not selected native format');
  const receipt=record.receipt;
  if(receipt?.type!=='ActivityPubVerifiedArrivalReceipt'||receipt.version!==1||!(/^[a-f0-9]{64}$/u.test(receipt.bodySha256))||!(receipt.recipient===null||typeof receipt.recipient==='string')||record.recipient!==receipt.recipient||record.key!==sha(canonicalJson(receipt)))throw new TypeError('original receipt identity differs from custody');
  if(typeof record.at!=='string'||!Number.isFinite(Date.parse(record.at)))throw new TypeError('original native instant unavailable');
  const activity=activityOf(record);if(canonicalJson(record.reply??null)!==canonicalJson(targetAp.activityPubReplyCoordinates(activity)))throw new TypeError('correlated reply differs from exact native body');if(sha(canonicalJson(activity))!==receipt.bodySha256)throw new TypeError('original receipt does not bind its body');
  const key=keyOf({receipt:record.key}),prior=maps.get('receipt',key);
  if(prior!==undefined&&prior.address!==address)throw new TypeError('conflicting native rows share one receipt key');
  if(prior===undefined)report.uniqueReceipts++;
  maps.put('receipt',key,{address,last:ordinal});ordinal++;report.inboxOccurrences++;
 }
 // Only candidate inbox data is replaced. Every original byte is still at source.
 fs.rmSync(path.join(output,'data/records',INBOX+'-records'),{recursive:true,force:true});
 fs.rmSync(path.join(output,'data/state',INBOX+'-state'),{recursive:true,force:true});
 ordinal=0;
 const target=targetAp.createActivityPubJournalCustody({stateDirectory:path.dirname(output)});
 if(path.resolve(target.root)!==output)throw new TypeError('candidate must be a journal under its state directory');
 for(const {address,record}of original.each(source,INBOX,{strict:true})){
  const receipt=maps.get('receipt',keyOf({receipt:record.key}));
  const received={...record,sourceOrder:exactOrdinal(ordinal++),...(record.reply===undefined?{}:{replyOrder:exactOrdinal(receipt.last)})};
  const id=store.put(output,INBOX,received);maps.put('translated',address,id);
  // The last received occurrence preserves a single stable receipt-key identity,
  // while all occurrence records remain visible to the source-order list fold.
  const receiptName=store.threadName(semanticAddress({type:INBOX,name:record.key}).id),sourceHead=original.readHead(source,INBOX,receiptName);
  if(sourceHead!==undefined&&sourceHead.frontier[0]!==address)throw new TypeError('source receipt head conflicts with its exact record');
  store.writeHead(output,INBOX,receiptName,{frontier:[id],...(sourceHead===undefined?{}:{at:sourceHead.at})});
  if(record.reply!==undefined&&record.recipient!==null){
   if(!record.reply||typeof record.reply.request!=='string'||!record.reply.request||typeof record.reply.sender!=='string'||!record.reply.sender||typeof record.recipient!=='string'||!record.recipient)throw new TypeError('original reply coordinates unavailable');
   const name=targetAp.activityPubReplyHead({identifier:record.recipient,...record.reply});
   if(original.readHead(source,INBOX,name)!==undefined)throw new TypeError('undeclared native source reply head');
   const head=store.readHead(output,INBOX,name),prior=head===undefined?undefined:{address:head.frontier[0],record:store.get(output,INBOX,head.frontier[0])};
   if(prior===undefined||targetAp.compareActivityPubReplyRows({address:id,record:received},prior)>=0)store.writeHead(output,INBOX,name,{frontier:[id]});
   if(prior===undefined)report.replyHeads++;
  }
 }
 // Preserve unrelated source inbox heads with translated same-type addresses.
 for(const {name,head}of original.heads(source,INBOX,{strict:true})){
  if(store.readHead(output,INBOX,name)!==undefined)continue;
  const frontier=head.frontier.map(ref=>{const typed=original.referenceOf(ref,INBOX);if(typed.type!==INBOX)return ref;const id=maps.get('translated',typed.id);if(id===undefined)throw new TypeError('source inbox head names an unavailable record');return typeof ref==='string'?id:{type:INBOX,id};});
  store.writeHead(output,INBOX,name,{frontier,at:head.at,...(head.closed?{closed:true}:{})});
 }
 // Native outbox's first-by-activity then first-by-request selection is separate
 // from the reply last-winner law. Streaming minima keep source traversal ties.
 let outgoingOrdinal=0;
 for(const held of original.each(source,OUTBOX,{strict:true})){
  const row={...held,ordinal:exactOrdinal(outgoingOrdinal++)};
  if(typeof row.record.at!=='string'||!Number.isFinite(Date.parse(row.record.at)))throw new TypeError('original native outgoing instant unavailable');
  if(row.record.causes!==undefined)throw new TypeError('unselected native outgoing custody references');
  const activity=activityOf(row.record);if(row.record.activityId!==activity.id||row.record.actorId!==(typeof activity.actor==='string'?activity.actor:activity.actor?.id))throw new TypeError('original outgoing coordinates differ from immutable wire');if(semanticAddress(activity).id!==row.record.contentNi)throw new TypeError('original outgoing identity differs from body');
  const key=keyOf({activity:row.record.activityId}),prior=maps.get('outgoing',key);
  if(prior!==undefined&&prior.address!==row.address)throw new TypeError('conflicting native rows share one outgoing activity identity');
  if(prior===undefined||lexical(row.record.at,prior.record.at)<0)maps.put('outgoing',key,row);
 }
 for(const {id,value:row}of maps.entries('outgoing')){
  const chosen=maps.get('outgoing',id);if(chosen.address!==row.address)continue;
  if(row.record.requestNi===undefined)continue;
  if(typeof row.record.requestNi!=='string'||!row.record.requestNi)throw new TypeError('original request identity unavailable');
  const requestKey=keyOf({request:row.record.requestNi}),prior=maps.get('request',requestKey);
  if(prior===undefined||lexical(row.record.at,prior.record.at)<0||(row.record.at===prior.record.at&&row.ordinal<prior.ordinal))maps.put('request',requestKey,row);
 }
 for(const {id,value:row}of maps.entries('request')){
  const chosen=maps.get('request',id);if(chosen.address!==row.address)continue;
  const name=targetAp.activityPubRequestHead(row.record.requestNi);if(original.readHead(source,OUTBOX,name)!==undefined)throw new TypeError('undeclared native source request head');if(store.readHead(output,OUTBOX,name)===undefined){store.writeHead(output,OUTBOX,name,{frontier:[row.address]});report.requestHeads++;}
  const received=await target.outbox.retainRequest(activityOf(row.record),{expectedRequestNi:row.record.requestNi});if(received.appended!==false)throw new TypeError('current receiver did not reuse original request');
 }
 for(const {record}of store.each(output,INBOX,{strict:true})){
  if(await target.inbox.get(record.receipt)===null)throw new TypeError('current receiver lost an original receipt');
  if(record.reply!==undefined&&record.recipient!==null&&await target.inbox.replyFor({identifier:record.recipient,...record.reply})===null)throw new TypeError('current receiver lost original reply correlation');
 }
 for(const type of [INBOX,OUTBOX,FOLLOWERS])for(const {head}of store.heads(output,type,{strict:true}))for(const step of store.walk(output,type,head.frontier,{limit:100000}))if(step.missing||step.truncated)throw new TypeError('received native head is incomplete');
 assertSourceStamps(stamps);fs.rmSync(mapsRoot,{recursive:true});report.qualified=true;return report;
}

/** Select a source representation, not a runtime fallback. The immutable source
 * provider and actual native/witnessed custody markers must agree. */
export function activityPubSourceFormat({source,sourceStoreRoot,sourceActivitypubRoot}){
 const journal=fs.readFileSync(path.join(sourceActivitypubRoot,'src/journal-custody.mjs'));
 const providerBlob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+journal.length+'\0'),journal])).digest('hex');
 const nativeProvider=providerBlob==='13bca0b8ea67de7841684dddc1fab7e9a77eb13d';
 const present=p=>fs.existsSync(path.join(source,p));
 const native=present('custody')||present('data/records')||[INBOX,OUTBOX,FOLLOWERS].some(type=>present('data/state/'+type+'-state'));
 let witnessed=present('bodies')||present('data/journals');
 const logs=path.join(source,'data/logs');if(fs.existsSync(logs)){const visit=p=>{const stat=fs.lstatSync(p);if(stat.isSymbolicLink())throw new TypeError('linked ActivityPub format marker');if(stat.isDirectory())for(const name of fs.readdirSync(p))visit(path.join(p,name));else if(p.endsWith('.witnesses')||p.endsWith('.admitted'))witnessed=true;};visit(logs);}
 if(!native&&!witnessed)throw new TypeError('ActivityPub source representation marker is absent');
 if(native&&witnessed)throw new TypeError('mixed native and witnessed ActivityPub custody is unsupported');
 if(nativeProvider){
  if(witnessed)throw new TypeError('native original provider cannot receive witnessed source custody');
  if(sha(fs.readFileSync(path.join(sourceStoreRoot,'src/store-core.mjs')))!=='6b6aff7436268affc37ba636f50924d326d4971bf9384b0b5b51805104e06d6d')throw new TypeError('native source store provider differs from selected format');
  return 'native-activitypub-13bca0b8';
 }
 if(native)throw new TypeError('native ActivityPub custody requires its verified native original provider');
 if(providerBlob!=='b645e7983a1bfcb7b86ef319bf351f5000d8c212')throw new TypeError('witnessed ActivityPub custody requires its verified original provider');
 // The existing witnessed converter must still parse the actual witnesses and
 // original projection through this explicitly selected historical provider.
 return 'witnessed-activitypub';
}

/** The existing queue law shared by both source representations. Ready bytes
 * are received into an isolated candidate, while the original queue stays put. */
export async function receiveActivityPubQueue({queue,output,currentAp,observe=()=>{}}){
 const {extractSenActivity}=await import(pathToFileURL(path.join(currentAp,'src/sen-activity.mjs')).href);
 const result={activated:0,retained:0,originalOnly:[],archivedOriginalOnly:0,archivedReadyOriginalOnly:0,archivedClaimedOriginalOnly:0};
 const files=function*(root){observe(root);for(const e of fs.readdirSync(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isSymbolicLink())throw new TypeError('queue custody contains a symlink');if(e.isDirectory())yield*files(p);else if(e.isFile())yield p;else throw new TypeError('queue custody contains a nonregular entry');}};
 const claimed=path.join(queue,'claimed');observe(queue);observe(claimed);
 if(fs.readdirSync(claimed).length)throw new TypeError('an actual claimed delivery requires outcome receiving before queue conversion');
 const ready=path.join(queue,'ready'),target=path.join(path.dirname(output),'queue','ready');
 for(const file of files(ready)){
  observe(file);const bytes=fs.readFileSync(file),item=JSON.parse(bytes.toString('utf8')),message=item.message,activity=message?.activity;let admissible=false;
  if(message?.type==='outbox'&&activity&&typeof activity==='object'){
   const sender=typeof activity.actor==='string'?activity.actor:activity.actor?.id,to=Array.isArray(activity.to)?activity.to[0]:activity.to,recipient=typeof to==='string'?to:to?.id;
   try{extractSenActivity(activity,{expectedActor:sender,expectedRecipient:recipient});admissible=true;}catch{}
  }
  if(!admissible){result.originalOnly.push({name:path.basename(file),sha256:sha(bytes),reason:'pending-wire-not-admitted-by-current-transport'});continue;}
  fs.mkdirSync(target,{recursive:true,mode:0o700});const destination=path.join(target,path.basename(file));fs.writeFileSync(destination,bytes,{flag:'wx',mode:0o600});
  if(!fs.readFileSync(destination).equals(bytes))throw new TypeError('pending queue bytes changed during receiving');result.retained++;
 }
 for(const entry of fs.readdirSync(queue,{withFileTypes:true})){
  if(!entry.name.startsWith('ready.')&&!entry.name.startsWith('claimed.'))continue;
  if(!entry.isDirectory())throw new TypeError('archived pending custody is not an ordinary directory');const archive=path.join(queue,entry.name);observe(archive);const count=fs.readdirSync(archive).length;
  result.archivedOriginalOnly+=count;result[entry.name.startsWith('ready.')?'archivedReadyOriginalOnly':'archivedClaimedOriginalOnly']+=count;
 }
 return result;
}
