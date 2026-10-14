import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {treeDigest} from '../../scripts/first-cutover.mjs';
const required=name=>{const value=process.env[name];if(!value)throw new TypeError(`qualification requires ${name}`);return path.resolve(value);};
const oldStore=required('MIGRATION_OLD_STORE'),newStore=required('MIGRATION_NEW_STORE');
const oldAp=required('MIGRATION_OLD_ACTIVITYPUB'),newAp=required('MIGRATION_NEW_ACTIVITYPUB');
const base=required('MIGRATION_FIXTURE_PARENT');
const load=(root,file)=>import(pathToFileURL(path.join(root,file)).href);
const {createActivityPubJournalCustody:originalCustody}=await load(oldAp,'src/journal-custody.mjs');
const {createActivityPubJournalCustody:currentCustody}=await load(newAp,'src/journal-custody.mjs');
const {recordSemanticRecord}=await load(oldStore,'src/record-semantic-record.mjs');
const {querySemanticRecords}=await load(oldStore,'src/query-semantic-records.mjs');
const store=await load(newStore,'src/store.mjs');
const {fileJournalStoreByKind}=await load(oldStore,'scripts/file-journal-store-by-kind.mjs');
const converter=fileURLToPath(new URL('../../scripts/convert-settlement.mjs',import.meta.url));
const actor={identifier:'fixture',actorId:'https://follower.example/actors/one',inboxId:'https://follower.example/inbox'};
function fixture(){
 const root=fs.mkdtempSync(path.join(base,'follower-')),stateDirectory=path.join(root,'original'),source=path.join(stateDirectory,'journal'),queue=path.join(stateDirectory,'queue');
 fs.mkdirSync(path.join(source,'bodies'),{recursive:true,mode:0o700});
 for(const name of ['ready','claimed'])fs.mkdirSync(path.join(queue,name),{recursive:true,mode:0o700});
 return {root,stateDirectory,source,queue,old:originalCustody({stateDirectory}),output:path.join(root,'candidate/journal')};
}
function write(f,told,at,record=actor,origin){return recordSemanticRecord({root:f.source,objectKind:'activitypub.custody',category:'followers',record,recordedAt:at,told,...(origin===undefined?{}:{origin})});}
async function convert(f,{refused=false}={}){
 const sourceBefore=treeDigest(f.source),queueBefore=treeDigest(f.queue);
 const args=[converter,'--settlement',f.source,'--into',f.output,'--old-store',oldStore,'--new-store',newStore,'--old-activitypub',oldAp,'--new-activitypub',newAp,'--activitypub','--queue',f.queue,'--report',path.join(f.root,'conversion.json')];
 const result=spawnSync(process.execPath,args,{encoding:'utf8',timeout:60000});
 assert.deepEqual(treeDigest(f.source),sourceBefore);assert.deepEqual(treeDigest(f.queue),queueBefore);
 if(refused){assert.notEqual(result.status,0);assert.match(result.stderr,/OneTimeStoreConversionRefused/);return;}
 assert.equal(result.status,0,result.stderr);const report=JSON.parse(fs.readFileSync(path.join(f.root,'conversion.json')));assert.equal(report.qualified,true);
 const current=currentCustody({stateDirectory:path.dirname(f.output)});
 for(const identifier of ['fixture','other']){
  assert.deepEqual(await current.followers.list({identifier}),await f.old.followers.list({identifier}));
  assert.equal(await current.followers.count({identifier}),await f.old.followers.count({identifier}));
 }
 const rows=[...store.each(f.output,'activitypub-follower',{strict:true})];assert.equal(report.types['activitypub-follower']?.verified??0,rows.length);
 return {current,rows,report};
}
test('actual original Follow then Undo remains unfollowed through current consumer',async()=>{
 const f=fixture();await f.old.followers.add(actor);await f.old.followers.remove(actor);
 assert.equal(await f.old.followers.count(actor),0);const r=await convert(f);assert.equal(r.rows.length,2);assert.deepEqual(r.rows.map(x=>x.record.following).sort(),[false,true]);
});
test('actual original Follow Undo Follow preserves refollow and complete native history',async()=>{
 const f=fixture();await f.old.followers.add(actor);await f.old.followers.remove(actor);await f.old.followers.add({...actor,inboxId:actor.inboxId+'/new'});
 assert.equal(await f.old.followers.count(actor),1);const r=await convert(f);assert.equal(r.rows.length,3);
});
for(const [charge,told]of [['denied',{for:false,against:true}],['unknown',{for:false,against:false}],['contested',{for:true,against:true}]])test(`actual original ${charge} follower fold remains removed`,async()=>{
 const f=fixture();write(f,{for:true,against:false},'2026-10-01T00:00:00.000Z');write(f,told,'2026-10-01T00:00:00.001Z',{identifier:actor.identifier,actorId:actor.actorId});
 assert.equal(await f.old.followers.count(actor),0);const r=await convert(f);assert.equal(r.rows.length,2);
});
test('independent actors and recipient partitions retain original selected current following',async()=>{
 const f=fixture();await f.old.followers.add(actor);await f.old.followers.add({...actor,actorId:actor.actorId+'/two'});await f.old.followers.add({...actor,identifier:'other'});await f.old.followers.remove(actor);
 const r=await convert(f);assert.equal(r.rows.length,4);
});
test('original duplicate and repeated Undo remain idempotent without reactivation',async()=>{
 const f=fixture();await f.old.followers.add(actor);await f.old.followers.add(actor);await f.old.followers.remove(actor);await f.old.followers.remove(actor);
 const before=querySemanticRecords({root:f.source,objectKind:'activitypub.custody',category:'followers'}).length;
 const r=await convert(f);assert.equal(r.rows.length,before);await r.current.followers.remove(actor);assert.equal([...store.each(f.output,'activitypub-follower')].length,before);
});
test('chronologically out-of-order original admissions fold by recorded time after migration',async()=>{
 const f=fixture();write(f,{for:true,against:false},'2026-10-02T00:00:00.000Z');write(f,{for:false,against:true},'2026-10-01T00:00:00.000Z',{identifier:actor.identifier,actorId:actor.actorId});
 assert.equal(await f.old.followers.count(actor),1);const r=await convert(f);assert.equal(r.rows.length,2);
});
test('same-instant Follow and Undo preserve the original append order',async()=>{
 const f=fixture();const at='2026-10-01T00:00:00.000Z';write(f,{for:true,against:false},at);write(f,{for:false,against:true},at,{identifier:actor.identifier,actorId:actor.actorId});
 assert.equal(await f.old.followers.count(actor),0);const r=await convert(f);assert.equal(r.rows.length,2);
});
test('same-instant same-state repeated original row stays one readable follower',async()=>{
 const f=fixture(),at='2026-10-01T00:00:00.000Z';write(f,{for:true,against:false},at);write(f,{for:true,against:false},at);
 assert.equal(await f.old.followers.count(actor),1);const r=await convert(f);assert.equal(r.rows.length,1);
});
test('same-instant Follow Undo Follow keeps all distinct original events in their admitted order',async()=>{
 const f=fixture(),at='2026-10-01T00:00:00.000Z';write(f,{for:true,against:false},at,actor,'first');write(f,{for:false,against:true},at,{identifier:actor.identifier,actorId:actor.actorId});write(f,{for:true,against:false},at,{...actor,inboxId:actor.inboxId+'/new'},'last');
 const r=await convert(f);assert.equal(r.rows.length,3);assert.deepEqual(r.rows.map(x=>x.record.sourceOrder).sort((a,b)=>a-b),[0,1,2]);
 assert.equal((await r.current.followers.list(actor)).items[0].inboxId,actor.inboxId+'/new');
});
test('same-instant distinct followers preserve original page order',async()=>{
 const f=fixture(),at='2026-10-01T00:00:00.000Z';for(const suffix of ['z','a','m'])write(f,{for:true,against:false},at,{...actor,actorId:actor.actorId+'/'+suffix});
 const r=await convert(f);assert.equal(r.rows.length,3);for(const limit of [1,2,3])assert.deepEqual(await r.current.followers.list({...actor,limit}),await f.old.followers.list({...actor,limit}));
});
test('distinct original witnesses with equal semantic values retain their admitted history',async()=>{
 const f=fixture(),at='2026-10-01T00:00:00.000Z';write(f,{for:true,against:false},at,actor,'first-origin');write(f,{for:true,against:false},at,actor,'second-origin');
 const prior=querySemanticRecords({root:f.source,objectKind:'activitypub.custody',category:'followers'});assert.equal(prior.length,2);assert.equal(prior[0].id,prior[1].id);assert.notEqual(prior[0].event,prior[1].event);
 const r=await convert(f);assert.equal(r.rows.length,2);assert.deepEqual(r.rows.map(x=>x.record.sourceOrder).sort((a,b)=>a-b),[0,1]);
});
test('replayed original witness after Undo is deduplicated before assigning source order',async()=>{
 const f=fixture(),at='2026-10-01T00:00:00.000Z';write(f,{for:true,against:false},at);write(f,{for:false,against:true},at,{identifier:actor.identifier,actorId:actor.actorId});
 const files=[];const visit=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else if(p.endsWith('.witnesses'))files.push(p);}};visit(f.source);assert.equal(files.length,1);
 const first=fs.readFileSync(files[0],'utf8').split('\n')[0];fs.appendFileSync(files[0],first+'\n');
 const r=await convert(f);assert.equal(r.rows.length,2);assert.equal(r.report.types['activitypub-follower'].duplicates,1);assert.equal(await r.current.followers.count(actor),0);
});
test('a later native event at a received instant supersedes preserved follower history',async()=>{
 const f=fixture(),at='2026-10-01T00:00:00.000Z';write(f,{for:true,against:false},at);const r=await convert(f);
 const native=currentCustody({stateDirectory:path.dirname(f.output),now:()=>at});await native.followers.remove(actor);
 assert.equal(await native.followers.count(actor),0);const rows=[...store.each(f.output,'activitypub-follower')];assert.equal(rows.length,2);assert.equal(rows.filter(x=>x.record.sourceOrder===undefined).length,1);
});
test('actual original inbox and outbox acknowledgments remain readable and idempotent in current custody',async()=>{
 const f=fixture(),arrival={recipient:'fixture',jsonLd:{type:'Create',id:'https://remote.example/one',object:{id:'https://remote.example/object'}}};
 const receipt=await f.old.inbox.retain(arrival);assert.deepEqual(await f.old.inbox.get(receipt),{activity:arrival.jsonLd,receipt});
 const wire={'@context':'https://www.w3.org/ns/activitystreams',type:'Create',id:'https://fixture.example/activities/one',actor:'https://fixture.example/actors/one',to:['https://www.w3.org/ns/activitystreams#Public'],object:{type:'Note',id:'https://fixture.example/notes/one',content:'preserve acknowledged publication'}};
 assert.equal((await f.old.outbox.append(wire)).appended,true);
 const r=await convert(f);assert.deepEqual(await r.current.inbox.get(receipt),{activity:arrival.jsonLd,receipt});assert.deepEqual(await r.current.inbox.retain(arrival),receipt);
 assert.equal((await r.current.inbox.list({identifier:'fixture'})).totalItems,1);
 assert.equal(r.current.outbox.count({}),1);assert.equal((await r.current.outbox.get({activityId:wire.id})).id.href,wire.id);assert.equal((await r.current.outbox.append(wire)).appended,false);
 assert.equal([...store.each(f.output,'activitypub-inbox')].length,1);assert.equal([...store.each(f.output,'activitypub-outbox')].length,1);
});
for(const times of [['2026-10-01T00:00:00.000Z','2026-10-01T00:00:00+00:00'],['2026-10-01t00:00:00z','2026-10-01T00:00:00Z']])test(`legacy timestamp comparison is received without rewriting ${times.join(' and ')}`,async()=>{
 const f=fixture();write(f,{for:true,against:false},times[0]);write(f,{for:false,against:true},times[1],{identifier:actor.identifier,actorId:actor.actorId});
 assert.equal(await f.old.followers.count(actor),0);const r=await convert(f);assert.deepEqual(r.rows.map(x=>x.record.at).sort(),[...times].sort());
});
test('the exact original filing guard preserves equal-time order and excludes other kinds',async()=>{
 const f=fixture(),at='2026-10-01T00:00:00.000Z';write(f,{for:true,against:false},at);write(f,{for:false,against:true},at,{identifier:actor.identifier,actorId:actor.actorId});
 recordSemanticRecord({root:f.source,objectKind:'fixture.unrelated',category:'followers',record:actor,recordedAt:at,told:{for:true,against:false}});
 const physical=path.join(f.source,'journals');fs.mkdirSync(physical);fs.symlinkSync(physical,path.join(f.source,'data/journals'));
 const filed=fileJournalStoreByKind(f.source);assert.deepEqual(filed.conflicts,[]);assert.ok(fs.lstatSync(path.join(f.source,'data/journals')).isFile());
 const r=await convert(f);assert.equal(r.rows.length,2);assert.equal(await r.current.followers.count(actor),0);assert.deepEqual(r.rows.map(x=>x.record.sourceOrder).sort((a,b)=>a-b),[0,1]);
});
for(const malformed of ['missing','forged'])test(`a ${malformed} witness identity is refused before source-order deduplication`,async()=>{
 const f=fixture();write(f,{for:true,against:false},'2026-10-01T00:00:00.000Z');
 const files=[];const visit=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else if(p.endsWith('.witnesses'))files.push(p);}};visit(f.source);assert.equal(files.length,1);
 const bytes=fs.readFileSync(files[0],'utf8'),line=bytes.split('\n')[0],witness=JSON.parse(line);if(malformed==='missing')delete witness.id;else witness.id='ni:///sha-256;'+'A'.repeat(43);
 const changed=JSON.stringify(witness);assert.ok(changed.length<=line.length);fs.writeFileSync(files[0],changed+' '.repeat(line.length-changed.length)+bytes.slice(line.length));
 await convert(f,{refused:true});
});
