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
const {recordSemanticRecord}=await load(oldStore,'src/record-semantic-record.mjs');
const {fileJournalStoreByKind}=await load(oldStore,'scripts/file-journal-store-by-kind.mjs');
const {querySemanticRecords}=await load(oldStore,'src/query-semantic-records.mjs');
const {eventForRow}=await load(oldStore,'src/journal/filesystem/events.mjs');
const {segmentAdmit}=await load(oldStore,'src/journal/filesystem/segment-store.mjs');
const {dataArtifactAddress}=await supplier(oldRequire,'@red-cup-engineering/eavt-services-section/data-artifact-address');
const store=await load(newStore,'src/store.mjs');
const {semanticAddress}=await supplier(newRequire,'@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address');
const results=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
function snapshot(root){const out={};function visit(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else if(e.isFile())out[path.relative(root,p)]=sha(fs.readFileSync(p));else throw Error('unexpected link');}}visit(root);return out;}
function record(root,kind,category,value,at,causes=[]){return recordSemanticRecord({root,objectKind:kind,category,record:value,recordedAt:at,told:{for:true,against:false},causes});}
function convert(root,output,report){return execFileSync(process.execPath,[converter,'--settlement',root,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});}
for(const kind of ['world','primary-health'])test(`genuine ${kind} old writer to current records; originals and rollback preserved`,()=>{
 const root=fs.mkdtempSync(path.join(base,`fixture-${kind}-`)),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'conversion.json');fs.mkdirSync(source);
 const at='2026-10-01T00:00:00Z',later='2026-10-02T00:00:00Z';let expected;
 if(kind==='world'){
  const a=record(source,'metroplat.clock.schedule','schedule',{id:'fixture-schedule',every:'1h'},at);
  record(source,'metroplat.clock.schedule','schedule',{id:'fixture-schedule',every:'2h'},later,a.events);
  const subject='structured-work-intent-fixture-migration';
  const row1=[{kind:'metroplat.claim-session',session:subject},'assert',{content:'preserve authored claim'},at];
  const e1=eventForRow(row1,'fixture-author');
  const row2=[{kind:'metroplat.claim-session',session:subject},'assert',{content:'follow original claim'},later];
  const e2=eventForRow(row2,'fixture-author',{causes:[e1.id]});
  for(const [row,event]of [[row1,e1],[row2,e2]])segmentAdmit(dataArtifactAddress({root:source,tier:'log',encoding:'jsonl',at:row[3],action:subject,subject}).path,[event]);
  const last=path.join(source,'data/state/clock/last');fs.mkdirSync(last,{recursive:true});fs.writeFileSync(path.join(last,'fixture-schedule.json'),JSON.stringify({schedule:'fixture-schedule',ranAt:later,ok:true,attempt:'fixture-attempt'}));
  assert.equal(querySemanticRecords({root:source,objectKind:'metroplat.clock.schedule',category:'schedule'}).length,2);
  expected={'clock-schedule':2,'claim-session':2,'schedule-run':1};
 }else{
  const a=record(source,'561-group.primary-system-health','primary-system-health',{system:'fixture-system',charge:'held',was:'unknown',message:'synthetic healthy'},at);
  record(source,'561-group.primary-system-health','primary-system-health',{system:'fixture-system',charge:'denied',was:'held',message:'synthetic stopped'},later,a.events);
  assert.equal(querySemanticRecords({root:source,objectKind:'561-group.primary-system-health',category:'primary-system-health'}).length,2);
  expected={'primary-system-health':2};
 }
 const before=snapshot(source),stdout=convert(source,output,report),r=JSON.parse(fs.readFileSync(report));assert.equal(r.qualified,true);assert.deepEqual(snapshot(source),before);
 for(const [type,n]of Object.entries(expected)){const rows=[...store.each(output,type,{strict:true})];assert.equal(rows.length,n);assert.equal(r.types[type].written,n);assert.equal(r.types[type].verified,n);for(const x of rows){assert.equal(semanticAddress(x.record).id,x.address);assert.deepEqual(store.get(output,type,x.address),x.record);}}
 assert.equal(r.causesDropped,0);
 if(kind==='world')for(const [type,name,count]of [['clock-schedule','fixture-schedule',2],['claim-session','structured-work-intent-fixture-migration',2],['schedule-run','fixture-schedule',1]]){const h=store.readHead(output,type,name);assert.equal(h.frontier.length,1);const walked=[...store.walk(output,type,h.frontier)];assert.equal(walked.length,count);assert.ok(walked.every(x=>x.record&&!x.missing&&!x.truncated));}
 // Reversal before any new writer: preserve both generations, restore unchanged source.
 const retained=path.join(root,'retained-original'),failed=path.join(root,'retained-candidate');fs.renameSync(source,retained);fs.renameSync(output,source);fs.renameSync(source,failed);fs.renameSync(retained,source);assert.deepEqual(snapshot(source),before);
 const oldCount=kind==='world'?querySemanticRecords({root:source,objectKind:'metroplat.clock.schedule',category:'schedule'}).length:querySemanticRecords({root:source,objectKind:'561-group.primary-system-health',category:'primary-system-health'}).length;assert.equal(oldCount,2);
 results.push({kind,root,expected,conversion:r,originalFiles:Object.keys(before).length,originalBytesUnchanged:true,oldReaderAfterRestoration:oldCount,newWriterActivated:false,stdout});
});
process.on('exit',()=>fs.writeFileSync(path.join(base,'world-fixture-results.json'),JSON.stringify(results,null,2)+'\n'));

test('genuinely empty historical world remains a qualified zero-record conversion',()=>{
 const root=fs.mkdtempSync(path.join(base,'fixture-empty-world-')),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'conversion.json');fs.mkdirSync(source);
 convert(source,output,report);const r=JSON.parse(fs.readFileSync(report));assert.equal(r.qualified,true);assert.deepEqual(r.types,{});assert.deepEqual(snapshot(source),{});
});

for(const destination of ['candidate','report'])test(`refuses a ${destination} symlink alias into original custody before writing`,()=>{
 const root=fs.mkdtempSync(path.join(base,'fixture-alias-')),source=path.join(root,'source'),alias=path.join(root,'alias');fs.mkdirSync(source);
 record(source,'metroplat.clock.schedule','schedule',{id:'alias-test',every:'1h'},'2026-10-01T00:00:00Z');
 fs.symlinkSync(source,alias);const before=snapshot(source);
 const output=destination==='candidate'?path.join(alias,'candidate'):path.join(root,'candidate');
 const report=destination==='report'?path.join(alias,'report.json'):path.join(root,'report.json');
 const refused=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});
 assert.notEqual(refused.status,0);assert.match(refused.stderr,/OneTimeStoreConversionRefused/);
 assert.deepEqual(snapshot(source),before);assert.equal(fs.existsSync(output),false);assert.equal(fs.existsSync(report),false);
});

test('genuine by-kind guard with ordinary in-custody logs converts without changing originals',()=>{
 const root=fs.mkdtempSync(path.join(base,'fixture-guard-')),source=path.join(root,'source'),output=path.join(root,'candidate'),report=path.join(root,'report.json');fs.mkdirSync(source);
 record(source,'metroplat.clock.schedule','schedule',{id:'guard-test',every:'1h'},'2026-10-01T00:00:00Z');
 const physical=path.join(source,'journals');fs.mkdirSync(physical);fs.symlinkSync(physical,path.join(source,'data/journals'));
 const filed=fileJournalStoreByKind(source);assert.deepEqual(filed.conflicts,[]);
 assert.ok(fs.lstatSync(path.join(source,'data/journals')).isFile());assert.ok(fs.lstatSync(path.join(source,'data/logs')).isDirectory());
 const before=snapshot(source);convert(source,output,report);const received=JSON.parse(fs.readFileSync(report));
 assert.equal(received.qualified,true);assert.equal(received.types['clock-schedule'].verified,1);assert.deepEqual(snapshot(source),before);
});

for(const marker of ['arbitrary','malformed-date','redirected-logs'])test(`refuses ${marker} historical journal root without changing originals`,()=>{
 const root=fs.mkdtempSync(path.join(base,'fixture-invalid-guard-')),source=path.join(root,'source'),output=path.join(root,'candidate'),report=path.join(root,'report.json');fs.mkdirSync(source);
 record(source,'metroplat.clock.schedule','schedule',{id:'invalid-guard-test',every:'1h'},'2026-10-01T00:00:00Z');
 const physical=path.join(source,'journals');fs.mkdirSync(physical);fs.symlinkSync(physical,path.join(source,'data/journals'));fileJournalStoreByKind(source);
 const guard=path.join(source,'data/journals');
 if(marker==='arbitrary')fs.writeFileSync(guard,'not a historical filing guard\n');
 if(marker==='malformed-date')fs.writeFileSync(guard,fs.readFileSync(guard,'utf8').replace(/since \d{4}-\d{2}-\d{2}/u,'since 2026-02-31'));
 let external;
 if(marker==='redirected-logs'){external=path.join(root,'external-logs');fs.renameSync(path.join(source,'data/logs'),external);fs.symlinkSync(external,path.join(source,'data/logs'));}
 const markerBefore=fs.readFileSync(guard),before=external?snapshot(external):snapshot(source);
 const refused=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});
 assert.notEqual(refused.status,0);assert.match(refused.stderr,/OneTimeStoreConversionRefused/);assert.equal(fs.existsSync(report),false);
 assert.deepEqual(fs.readFileSync(guard),markerBefore);assert.deepEqual(external?snapshot(external):snapshot(source),before);
 if(external)assert.equal(fs.readlinkSync(path.join(source,'data/logs')),external);
});
