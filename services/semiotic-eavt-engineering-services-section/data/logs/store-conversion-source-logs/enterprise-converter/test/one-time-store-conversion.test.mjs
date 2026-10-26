import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import {recordSemanticRecord} from '../src/record-semantic-record.mjs';
import {sourceFiles} from '../scripts/conversion-buckets.mjs';

const oldRoot=path.resolve(import.meta.dirname,'..');
const writer=process.env.CONVERSION_WRITER;
assert.ok(writer,'CONVERSION_WRITER must name the selected immutable writer');
const store=await import(pathToFileURL(path.join(writer,'src/store.mjs')));
const require=createRequire(path.join(writer,'package.json'));
const rootJson=await import(pathToFileURL(require.resolve('@red-cup-engineering/json-services-section')));
const jsonRoot=path.dirname(require.resolve('@red-cup-engineering/json-services-section/package.json'));
const jsonManifest=JSON.parse(fs.readFileSync(path.join(jsonRoot,'package.json')));
const conditionalJson=await import(pathToFileURL(path.join(jsonRoot,jsonManifest.exports['./canonical-json'].import)));
const fixtureBase=path.join(oldRoot,'data/logs/store-conversion-regression-logs');
fs.mkdirSync(fixtureBase,{recursive:true});
const stamp=root=>[...sourceFiles(root)].map(file=>[path.relative(root,file),createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
function convert(source,output,report){return spawnSync(process.execPath,[path.join(oldRoot,'scripts/convert-settlement.mjs'),'--settlement',source,'--into',output,'--old-store',oldRoot,'--new-store',writer,'--report',report],{encoding:'utf8'});}

test('recovered supplier graph preserves the original published semantic-record address',t=>{
 const root=fs.mkdtempSync(path.join(fixtureBase,'original-address-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const record=recordSemanticRecord({root,objectKind:'test.semantic-record',category:'research',record:{type:'Observation',value:1},recordedAt:'2026-08-14T00:00:00.000Z',told:{for:true,against:false}});
 assert.equal(record.id,'ni:///sha-256;2f_Hpk0mHzRPzxNX8_jf83KKWvNAYFvadX86BFATjUI');
});

test('canonicalJson root export is the original conditional supplier function',()=>{
  assert.equal(rootJson.canonicalJson,conditionalJson.canonicalJson);
  assert.equal(rootJson.canonicalJson({z:1,a:[false,null]}),'{"a":[false,null],"z":1}');
  assert.throws(()=>require.resolve('@red-cup-engineering/json-services-section/canonical-json'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
});

test('original witnessed claim threads and alternate Codex records reach the current reader without donor writes',t=>{
 const root=fs.mkdtempSync(path.join(fixtureBase,'case-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const donor=path.join(root,'donor');fs.mkdirSync(donor);
 const base={root:donor,category:'fixture',recordedAt:'2026-10-14T00:00:00.000Z',told:{for:true,against:false}};
 recordSemanticRecord({...base,objectKind:'structured-work-intent-fixture',record:{id:'fixture-work',status:'open'}});
 recordSemanticRecord({...base,objectKind:'structured-work-intent-fixture',recordedAt:'2026-10-14T00:00:01.000Z',record:{id:'fixture-work',status:'ready'}});
 const codex={id:'fixture-codex',status:'queued',prompt:'preserve this bounded task'};
 recordSemanticRecord({...base,objectKind:'codex-tasks',record:codex});
 const before=stamp(donor),output=path.join(root,'candidate'),report=path.join(root,'report.json');
 const result=convert(donor,output,report);assert.equal(result.status,0,result.stderr);
 const receipt=JSON.parse(fs.readFileSync(report));assert.equal(receipt.qualified,true);assert.equal(receipt.mainQualified,true);
 assert.deepEqual(stamp(donor),before);assert.equal(receipt.ordersExecuted,false);assert.equal(receipt.transportActivated,false);
 assert.equal(receipt.types['claim-session'].verified,2);assert.equal(receipt.types['codex-task'].verified,1);
 const claimHead=store.readHead(output,'claim-session','structured-work-intent-fixture');
 const rows=[...store.walk(output,'claim-session',claimHead.frontier,{limit:10})];assert.equal(rows.length,2);assert.ok(rows.every(x=>!x.missing&&!x.truncated));
 const tasks=[...store.each(output,'codex-task')];assert.deepEqual(tasks[0].record,{...codex,causes:[]});
 assert.deepEqual(store.get(output,'codex-task',tasks[0].address),{...codex,causes:[]});
 const existing=convert(donor,output,path.join(root,'refused.json'));assert.equal(existing.status,1);assert.equal(JSON.parse(existing.stderr).type,'OneTimeStoreConversionRefused');assert.ok(!fs.existsSync(path.join(root,'refused.json')));
 const nested=convert(donor,path.join(donor,'nested'),path.join(root,'nested-report.json'));assert.equal(nested.status,1);assert.ok(!fs.existsSync(path.join(donor,'nested')));assert.deepEqual(stamp(donor),before);
});
