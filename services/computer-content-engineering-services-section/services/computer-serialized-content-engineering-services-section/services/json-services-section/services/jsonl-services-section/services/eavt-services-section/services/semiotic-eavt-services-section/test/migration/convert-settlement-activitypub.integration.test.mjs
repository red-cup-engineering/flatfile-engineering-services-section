import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const required=name=>{const value=process.env[name];if(!value)throw new TypeError(`qualification requires ${name}`);return path.resolve(value);};
const oldStore=required('MIGRATION_OLD_STORE'),newStore=required('MIGRATION_NEW_STORE');
const base=required('MIGRATION_FIXTURE_PARENT');
const oldRequire=createRequire(path.join(oldStore,'package.json')),newRequire=createRequire(path.join(newStore,'package.json'));
const load=(root,file)=>import(pathToFileURL(path.join(root,file)).href);
const supplier=(resolve,spec)=>import(pathToFileURL(resolve.resolve(spec)).href);
const converter=fileURLToPath(new URL('../../scripts/convert-settlement.mjs',import.meta.url));
const oldAp=required('MIGRATION_OLD_ACTIVITYPUB'),newAp=required('MIGRATION_NEW_ACTIVITYPUB');
const oldApRequire=createRequire(path.join(oldAp,'package.json'));
const {recordSemanticRecord}=await load(oldStore,'src/record-semantic-record.mjs');
const {createFileStoreSync}=await supplier(oldApRequire,'@red-cup-engineering/immutable-content-custody-service/file-store');
const {createImmutableContentCustody,immutableContentKey}=await supplier(oldApRequire,'@red-cup-engineering/immutable-content-custody-service');
const {makeNiUri}=await supplier(oldRequire,'@red-cup-engineering/uri-services-section/ni-uri');
const {canonicalJson}=await supplier(oldRequire,'@red-cup-engineering/json-services-section/canonical-json');
const {projectSenActivity,senActivityObjectBytes}=await load(newAp,'src/sen-activity.mjs');
const {FlatfileMessageQueue}=await load(newAp,'src/flatfile-queue.mjs');
const store=await load(newStore,'src/store.mjs');
const {fileJournalStoreByKind}=await load(oldStore,'scripts/file-journal-store-by-kind.mjs');
const results=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
function snapshot(root){const out={};function visit(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else if(e.isFile())out[path.relative(root,p)]=sha(fs.readFileSync(p));else throw Error('unexpected link');}}visit(root);return out;}
for(const scenario of ['accepted','unadmitted','archived','claimed-archived','empty','missing-queue','guarded'])test(`genuine ActivityPub conversion preserves bodies and ${scenario} pending custody`,async()=>{
 const root=fs.mkdtempSync(path.join(base,'fixture-ap-')),source=path.join(root,'original','journal'),output=path.join(root,'candidate','journal'),report=path.join(root,'conversion.json');fs.mkdirSync(source,{recursive:true});
 const at='2026-10-01T00:00:00Z',activity={id:'https://fixture.example/activities/1',type:'Create',actor:'https://fixture.example/actors/fixture',to:'https://recipient.example/actors/fixture',object:{type:'Note',content:'synthetic retained message'}};
 const body=Buffer.from(canonicalJson(activity)),ni=makeNiUri(body),originalBodies=createFileStoreSync(path.join(source,'bodies')),custody=createImmutableContentCustody({store:originalBodies}),bodyReference=await custody.put({ni,bytes:body,mediaType:'application/json'});
 const held=(category,record)=>recordSemanticRecord({root:source,objectKind:'activitypub.custody',category,record,recordedAt:at,told:{for:true,against:false}});
 const receipt={type:'ActivityPubVerifiedArrivalReceipt',version:1,bodySha256:sha(body),recipient:'fixture'};
 held('inbox',{key:sha(canonicalJson(receipt)),recipient:'fixture',bodyReference,receipt});
 held('outbox',{activityId:activity.id,bodyReference});held('followers',{actor:'https://follower.example/actor'});
 const queue=path.join(root,'original','queue'),spool=new FlatfileMessageQueue({directory:queue});
 const pending=projectSenActivity({type:'Create',origin:'https://fixture.example',identifier:'fixture',recipient:'https://recipient.example/actors/fixture',objectBytes:senActivityObjectBytes({objectKind:'fixture-message',value:{text:'preserve pending delivery'}}),agentCard:'https://fixture.example/agent-card.json',eventTime:at});
 if(scenario!=='empty')await spool.enqueue({type:'outbox',activity:scenario==='unadmitted'?activity:pending},{orderingKey:'fixture-order'});
 if(scenario==='archived'||scenario==='claimed-archived'){const archived=path.join(queue,scenario==='archived'?'ready.retained':'claimed.incident-20261001T000000Z-1');fs.mkdirSync(archived);fs.writeFileSync(path.join(archived,'retained.json'),JSON.stringify({message:{type:'outbox',activity}}));}
 if(scenario==='guarded'){
  // Genuine prior filing with an in-custody physical destination, not an
  // externally redirected store whose custody has not been selected.
  const physical=path.join(source,'journals');fs.mkdirSync(physical);
  fs.symlinkSync(physical,path.join(source,'data/journals'));
  const filed=fileJournalStoreByKind(source);assert.deepEqual(filed.conflicts,[]);
  assert.ok(fs.lstatSync(path.join(source,'data/journals')).isFile());
  assert.ok(fs.lstatSync(path.join(source,'data/logs')).isDirectory());
 }
 const queueBefore=snapshot(queue);
 const before=snapshot(source);
 const args=[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--old-activitypub',oldAp,'--new-activitypub',newAp,'--activitypub','--report',report];
 if(scenario==='missing-queue'){
  const refused=spawnSync(process.execPath,args,{encoding:'utf8',timeout:60000});
  assert.notEqual(refused.status,0);assert.match(refused.stderr,/OneTimeStoreConversionRefused/);
  assert.equal(fs.existsSync(output),false);assert.equal(fs.existsSync(report),false);
  assert.deepEqual(snapshot(source),before);assert.deepEqual(snapshot(queue),queueBefore);return;
 }
 args.push('--queue',queue);execFileSync(process.execPath,args,{encoding:'utf8',timeout:60000});
 const r=JSON.parse(fs.readFileSync(report));results.push({scenario,root,report:r,originalsUnchanged:JSON.stringify(snapshot(source))===JSON.stringify(before)});assert.deepEqual(snapshot(source),before);assert.equal(r.qualified,['accepted','empty','guarded'].includes(scenario));assert.equal(r.queue.retained,['unadmitted','empty'].includes(scenario)?0:1);assert.equal(r.queue.originalOnly.length,scenario==='unadmitted'?1:0);assert.equal(r.queue.archivedOriginalOnly,['archived','claimed-archived'].includes(scenario)?1:0);assert.equal(r.queue.archivedReadyOriginalOnly,scenario==='archived'?1:0);assert.equal(r.queue.archivedClaimedOriginalOnly,scenario==='claimed-archived'?1:0);assert.equal(r.queue.activated,0);assert.deepEqual(snapshot(queue),queueBefore);
 const ready=fs.readdirSync(path.join(queue,'ready'));assert.equal(ready.length,scenario==='empty'?0:1);if(!['unadmitted','empty'].includes(scenario))assert.deepEqual(fs.readFileSync(path.join(queue,'ready',ready[0])),fs.readFileSync(path.join(root,'candidate','queue','ready',ready[0])));
 for(const type of ['activitypub-inbox','activitypub-outbox','activitypub-follower']){const rows=[...store.each(output,type,{strict:true})];assert.equal(rows.length,1,`lost ${type}`);assert.equal(r.types[type].written,1);assert.equal(r.types[type].verified,1);}
 const newBodies=createFileStoreSync(path.join(output,'custody'));assert.deepEqual(newBodies.get(immutableContentKey(ni)).body,body);
});
process.on('exit',()=>fs.writeFileSync(path.join(base,'activitypub-fixture-results.json'),JSON.stringify(results,null,2)+'\n'));
