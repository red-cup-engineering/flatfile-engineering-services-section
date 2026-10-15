import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {receiveNativeActivityPub} from '../../scripts/receive-native-activitypub.mjs';
const required=name=>{const value=process.env[name];if(!value)throw new TypeError(`native receiving requires ${name}`);return path.resolve(value);};
const sourceStoreRoot=required('MIGRATION_NATIVE_SOURCE_STORE'),targetStoreRoot=required('MIGRATION_TARGET_STORE'),sourceActivitypubRoot=required('MIGRATION_NATIVE_SOURCE_ACTIVITYPUB'),targetActivitypubRoot=required('MIGRATION_TARGET_ACTIVITYPUB'),fixtureParent=required('MIGRATION_FIXTURE_PARENT');
const load=(root,file)=>import(pathToFileURL(path.join(root,file)).href),resolve=createRequire(path.join(sourceStoreRoot,'package.json'));
const sourceAp=await load(sourceActivitypubRoot,'src/journal-custody.mjs'),targetAp=await load(targetActivitypubRoot,'src/journal-custody.mjs'),store=await load(sourceStoreRoot,'src/store.mjs');
const {projectSenActivity,senActivityObjectBytes}=await load(sourceActivitypubRoot,'src/sen-activity.mjs');
const {semanticAddress}=await import(pathToFileURL(resolve.resolve('@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address')));
const {niBucketPath}=await import(pathToFileURL(resolve.resolve('@red-cup-engineering/computer-content-address-engineering-services-section/ni-path')));
const {canonicalJson}=await import(pathToFileURL(resolve.resolve('@red-cup-engineering/json-services-section/canonical-json')));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const snapshot=root=>{const out={};const visit=d=>{out[(path.relative(root,d)||'.')+'/']={directory:true,mode:fs.statSync(d).mode&0o777};for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else out[path.relative(root,p)]=sha(fs.readFileSync(p));}};visit(root);return out;};
const at='2026-10-14T00:00:00.000Z',later='2026-10-14T00:00:01.000Z',sender='https://peer.example/actors/world',request='https://caller.example/activities/request',identifier='world';
const wire=(n,{reply=true,time=at}={})=>projectSenActivity({type:'Create',origin:'https://peer.example',identifier:'world',recipient:'https://caller.example/actors/world',objectBytes:senActivityObjectBytes({objectKind:reply?'metroplat.dispatch.result':'metroplat.dispatch.request',value:reply?{request,result:{stdout:'answer '+n}}:{work:'original request'}}),agentCard:sender+'/agent-card.json',eventTime:time});
function fixture(){const dir=fs.mkdtempSync(path.join(fixtureParent,'native-correlation-'));const source=path.join(dir,'source/journal'),output=path.join(dir,'candidate/journal');fs.mkdirSync(source,{recursive:true});return{dir,source,output,old:now=>sourceAp.createActivityPubJournalCustody({stateDirectory:path.dirname(source),now:()=>now})};}
async function convert(f){const before=snapshot(f.source),report=await receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot});assert.deepEqual(snapshot(f.source),before);assert.equal(report.qualified,true);return{report,current:targetAp.createActivityPubJournalCustody({stateDirectory:path.dirname(f.output)})};}
async function assertReplies(f,wires){const before=f.old(at),wanted=await before.inbox.replyFor({identifier,request,sender}),pages=[];for(let cursor; ;){const p=await before.inbox.list({identifier,limit:2,cursor});pages.push(p);if(!p.nextCursor)break;cursor=p.nextCursor;}
 const{report,current}=await convert(f);assert.deepEqual(await current.inbox.replyFor({identifier,request,sender}),wanted);let cursor;for(const p of pages){assert.deepEqual(await current.inbox.list({identifier,limit:2,cursor}),p);cursor=p.nextCursor;}
 const recorded=[...store.each(f.output,'activitypub-inbox')];assert.equal(recorded.length,report.inboxOccurrences);assert.deepEqual(recorded.map(x=>x.record.sourceOrder).sort((a,b)=>a-b),Array.from({length:recorded.length},(_,i)=>i));
 for(const w of wires){await current.inbox.retain({recipient:identifier,jsonLd:w});assert.deepEqual(await current.inbox.replyFor({identifier,request,sender}),wanted);}
 return{report,current,wanted};}
for(const[name,times]of [['monotone',[at,later]],['reverse',[later,at]],['equal',[at,at]],['legacy-spellings',['2026-10-14T00:00:00.000Z','2026-10-14T00:00:00+00:00']]])test('native '+name+' replies preserve actual baseline winner, full paging, timestamps and replay',async()=>{const f=fixture(),wires=times.map((_,i)=>wire(i));for(let i=0;i<wires.length;i++)await f.old(times[i]).inbox.retain({recipient:identifier,jsonLd:wires[i]});const{report}=await assertReplies(f,wires);assert.equal(report.inboxOccurrences,2);assert.deepEqual([...store.each(f.output,'activitypub-inbox')].map(x=>x.record.at).sort(),[...times].sort());});
function colliding(){const buckets=new Map();for(let n=0;n<1000;n++){const w=wire(n),body=Buffer.from(canonicalJson(w)),receipt={type:'ActivityPubVerifiedArrivalReceipt',version:1,bodySha256:sha(body),recipient:identifier};const r={key:sha(canonicalJson(receipt)),receipt,recipient:identifier,activityNi:'ni:///sha-256;'+createHash('sha256').update(body).digest('base64url'),activityBytes:body.length,reply:{request,sender},at};const id=semanticAddress(r).id,bucket=niBucketPath(id);if(buckets.has(bucket))return[buckets.get(bucket),{wire:w,record:r,id,bucket}];buckets.set(bucket,{wire:w,record:r,id,bucket});}throw Error('no collision fixture');}
for(const replay of [false,true])test(`same-bucket equal-time native history${replay?' with duplicated older physical occurrence':''} preserves exact old reader result`,async()=>{const f=fixture(),pair=colliding();for(const item of pair){await f.old(at).inbox.retain({recipient:identifier,jsonLd:item.wire});assert.deepEqual(store.get(f.source,'activitypub-inbox',item.id),item.record);}
 if(replay){const file=path.join(f.source,'data/records/activitypub-inbox-records',pair[0].bucket);fs.appendFileSync(file,JSON.stringify({id:pair[0].id,record:pair[0].record})+'\n');}
 const{report}=await assertReplies(f,pair.map(x=>x.wire));assert.equal(report.inboxOccurrences,replay?3:2);assert.equal(report.uniqueReceipts,2);
});
test('original request retains its exact durable wire and reuses it after native head conversion',async()=>{const f=fixture(),w=wire(0,{reply:false}),first=await f.old(at).outbox.retainRequest(w);assert.equal(first.appended,true);const{current,report}=await convert(f);assert.equal(report.requestHeads,1);const again=await current.outbox.retainRequest(wire(0,{reply:false,time:later}));assert.equal(again.appended,false);assert.deepEqual(again.held,w);assert.equal(again.contentNi,first.contentNi);});
test('a conflicting row sharing an original receipt key refuses without changing original custody',async()=>{const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(0)});const row=[...store.each(f.source,'activitypub-inbox')][0];store.put(f.source,'activitypub-inbox',{...row.record,at:later});const before=snapshot(f.source);await assert.rejects(receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot}),/conflicting native rows/);assert.deepEqual(snapshot(f.source),before);});
test('an undeclared ordered source format refuses rather than silently replacing ordering evidence',async()=>{const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(0)});const row=[...store.each(f.source,'activitypub-inbox')][0];store.put(f.source,'activitypub-inbox',{...row.record,replyOrder:-1});const before=snapshot(f.source);await assert.rejects(receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot}),/not selected native format/);assert.deepEqual(snapshot(f.source),before);});
for(const times of [[later,at],[at,at]])test('competing genuine request records retain original first-request winner '+times.join('/'),async()=>{
 const f=fixture(),other=fixture(),wires=[wire(0,{reply:false}),wire(0,{reply:false,time:later})];
 await f.old(times[0]).outbox.retainRequest(wires[0]);await other.old(times[1]).outbox.retainRequest(wires[1]);
 // A merge of two independently retained request records, with both exact
 // immutable bodies, is a genuine possible native input. Neither wire changes.
 for(const {record}of store.each(other.source,'activitypub-outbox'))store.put(f.source,'activitypub-outbox',record);
 fs.cpSync(path.join(other.source,'custody'),path.join(f.source,'custody'),{recursive:true});
 const before=snapshot(f.source),expected=await f.old(at).outbox.retainRequest(wires[1]);assert.equal(expected.appended,false);assert.deepEqual(snapshot(f.source),before);
 const{current}=await convert(f);const actual=await current.outbox.retainRequest(wires[0]);assert.equal(actual.appended,false);assert.deepEqual(actual.held,expected.held);assert.equal(actual.contentNi,expected.contentNi);assert.equal([...store.each(f.output,'activitypub-outbox')].length,2);
});
test('forged correlation metadata never becomes a verified reply head',async()=>{
 const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(0)});const row=[...store.each(f.source,'activitypub-inbox')][0];
 // Replace only the disposable source fixture with a genuinely content-addressed
 // but semantically forged row. Body and receipt still prove the original wire.
 fs.rmSync(path.join(f.source,'data/records/activitypub-inbox-records'),{recursive:true});const forged=store.put(f.source,'activitypub-inbox',{...row.record,reply:{...row.record.reply,request:request+'/forged'}});store.writeHead(f.source,'activitypub-inbox',store.threadName(semanticAddress({type:'activitypub-inbox',name:row.record.key}).id),{frontier:[forged]});const before=snapshot(f.source);
 await assert.rejects(receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot}),/correlated reply differs/);assert.deepEqual(snapshot(f.source),before);
});
test('independent recipients and ordinary arrivals preserve every original page and body',async()=>{
 const f=fixture(),a=wire(1),b=wire(2);await f.old(at).inbox.retain({recipient:identifier,jsonLd:a});await f.old(at).inbox.retain({recipient:'other-world',jsonLd:b});await f.old(at).inbox.retain({recipient:null,jsonLd:{type:'Create',id:'https://ordinary.example/one'}});
 const expected=await Promise.all([{}, {identifier}, {identifier:'other-world'}].map(q=>f.old(at).inbox.list(q)));const{current,report}=await convert(f);assert.equal(report.inboxOccurrences,3);assert.equal(report.replyHeads,2);for(let i=0;i<expected.length;i++)assert.deepEqual(await current.inbox.list([{}, {identifier}, {identifier:'other-world'}][i]),expected[i]);
});
test('missing immutable source bytes refuses and leaves the full original remainder unchanged',async()=>{
 const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(0)});fs.renameSync(path.join(f.source,'custody'),path.join(f.dir,'retained-bodies'));const before=snapshot(f.source),retained=snapshot(path.join(f.dir,'retained-bodies'));
 await assert.rejects(receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot}));assert.deepEqual(snapshot(f.source),before);assert.deepEqual(snapshot(path.join(f.dir,'retained-bodies')),retained);
});
test('a correlated body received without a local recipient retains ordinary inbox custody without inventing a reply audience',async()=>{
 const f=fixture(),w=wire(5),receipt=await f.old(at).inbox.retain({recipient:null,jsonLd:w}),expected=await f.old(at).inbox.list({});const{current,report}=await convert(f);assert.equal(report.replyHeads,0);assert.deepEqual(await current.inbox.get(receipt),{activity:w,receipt});assert.deepEqual(await current.inbox.list({}),expected);assert.equal(await current.inbox.replyFor({identifier,request,sender}),null);
});
test('new native equal-time reply follows migrated history while clock regression and replay cannot regress the head',async()=>{
 const f=fixture(),oldWire=wire(10);await f.old(later).inbox.retain({recipient:identifier,jsonLd:oldWire});await convert(f);
 const next=targetAp.createActivityPubJournalCustody({stateDirectory:path.dirname(f.output),now:()=>later}),newWire=wire(11);await next.inbox.retain({recipient:identifier,jsonLd:newWire});assert.deepEqual(await next.inbox.replyFor({identifier,request,sender}),newWire);
 await targetAp.createActivityPubJournalCustody({stateDirectory:path.dirname(f.output),now:()=>at}).inbox.retain({recipient:identifier,jsonLd:wire(12)});await next.inbox.retain({recipient:identifier,jsonLd:oldWire});assert.deepEqual(await next.inbox.replyFor({identifier,request,sender}),newWire);
});
for(const order of [Number.MAX_SAFE_INTEGER,-1,1.5])test('received reply head order '+order+' refuses unsafe continuation without partial acknowledgment',async()=>{
 const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(20)});const{current}=await convert(f);const name=targetAp.activityPubReplyHead({identifier,request,sender}),head=store.readHead(f.output,'activitypub-inbox',name),record=store.get(f.output,'activitypub-inbox',head.frontier[0]),id=store.put(f.output,'activitypub-inbox',{...record,replyOrder:order});store.writeHead(f.output,'activitypub-inbox',name,{frontier:[id]});const before=snapshot(f.output);
 if(order!==Number.MAX_SAFE_INTEGER)await assert.rejects(current.inbox.replyFor({identifier,request,sender}),/semantic order/);
 await assert.rejects(current.inbox.retain({recipient:identifier,jsonLd:wire(21)}),/order/);assert.deepEqual(snapshot(f.output),before);
});
for(const state of ['closed-receipt','multiple-receipt','existing-reply'])test('unsupported source '+state+' head cannot be silently overwritten',async()=>{
 const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(30)});await f.old(later).inbox.retain({recipient:identifier,jsonLd:wire(31)});const rows=[...store.each(f.source,'activitypub-inbox')],name=state==='existing-reply'?targetAp.activityPubReplyHead({identifier,request,sender}):store.threadName(semanticAddress({type:'activitypub-inbox',name:rows[0].record.key}).id);store.writeHead(f.source,'activitypub-inbox',name,{frontier:state==='multiple-receipt'?rows.map(x=>x.address):[rows[0].address],...(state==='closed-receipt'?{closed:true}:{})});const before=snapshot(f.source);
 await assert.rejects(receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot}),state==='existing-reply'?/undeclared native source reply head/:/unsupported native source head state/);assert.deepEqual(snapshot(f.source),before);
});
test('a closed original outgoing activity head remains unsupported instead of reopening during request-head receiving',async()=>{
 const f=fixture(),w=wire(0,{reply:false});await f.old(at).outbox.retainRequest(w);const row=[...store.each(f.source,'activitypub-outbox')][0],name=store.threadName(semanticAddress({type:'activitypub-outbox',name:w.id}).id);store.writeHead(f.source,'activitypub-outbox',name,{frontier:[row.address],closed:true});const before=snapshot(f.source);await assert.rejects(receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot}),/unsupported native source head state/);assert.deepEqual(snapshot(f.source),before);
});

test('interrupted prior candidate cannot be mistaken for the original native source',async()=>{const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(1)});fs.mkdirSync(path.join(f.source,'.conversion-correlation'));const before=snapshot(f.source);await assert.rejects(receiveNativeActivityPub({...f,sourceStoreRoot,targetStoreRoot,sourceActivitypubRoot,targetActivitypubRoot}),/interrupted correlation candidate/);assert.deepEqual(snapshot(f.source),before);assert.equal(fs.existsSync(f.output),false);});

test('translated original receipt and unrelated heads retain exact original head timestamps',async()=>{const f=fixture();await f.old(at).inbox.retain({recipient:identifier,jsonLd:wire(1)});const row=[...store.each(f.source,'activitypub-inbox')][0],receiptName=store.threadName(semanticAddress({type:'activitypub-inbox',name:row.record.key}).id),other=store.threadName(semanticAddress({name:'preserved-original-head'}).id);store.writeHead(f.source,'activitypub-inbox',receiptName,{frontier:[row.address],at:'2026-10-14T00:00:00+00:00'});store.writeHead(f.source,'activitypub-inbox',other,{frontier:[row.address],at:'2026-10-13T23:00:00.000Z'});await convert(f);for(const name of [receiptName,other])assert.equal(store.readHead(f.output,'activitypub-inbox',name).at,store.readHead(f.source,'activitypub-inbox',name).at);});
