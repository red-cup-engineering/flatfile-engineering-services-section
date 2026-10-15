import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {fileURLToPath} from 'node:url';
const required=name=>{const value=process.env[name];if(!value)throw new TypeError(`qualification requires ${name}`);return path.resolve(value);};
const oldStore=required('MIGRATION_OLD_STORE'),newStore=required('MIGRATION_NEW_STORE'),organizing=required('MIGRATION_CURRENT_ORGANIZING');
const load=(root,file)=>import(pathToFileURL(path.join(root,file)).href);
const {recordSemanticRecord}=await load(oldStore,'src/record-semantic-record.mjs');
const store=await load(newStore,'src/store.mjs');
const {moveOf,workBoard,createWorkArenaReader}=await load(organizing,'src/enterprise/work-arena.mjs');
const base=required('MIGRATION_FIXTURE_PARENT'),converter=fileURLToPath(new URL('../../scripts/convert-settlement.mjs',import.meta.url));
const at='2026-10-14T00:00:00Z',later='2026-10-14T00:01:00Z',now='2026-10-14T00:02:00Z';
const question=moveOf({move:'ask',by:'alice',question:'Is coordination working?',at});
const answer=moveOf({move:'answer',thread:question.id,by:'bob',says:'Both agents see the same work.',evidence:['ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],at:later});
const request=moveOf({move:'request',by:'alice',need:'Shared coordination remains available.',scope:['section:services/test'],requirements:[{id:'r1',says:'The shared board shall retain both agents’ work.',class:'functional',priority:'must',rationale:'Agents need shared work.'}],conditions:[{id:'c1',says:'Two agents observe the same work.',verifies:['r1'],method:'test'}],at});
const promise=moveOf({move:'promise',thread:request.id,by:'bob',at:later});
const snapshot=root=>{const result={};const visit=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else result[path.relative(root,p)]=createHash('sha256').update(fs.readFileSync(p)).digest('hex');}};visit(root);return result;};
const results=[];
for(const [name,moves,withCause]of [['opening-only',[question],false],['answer-without-cause',[question,answer],false],['answer-with-cause',[question,answer],true],['promise-without-cause',[request,promise],false],['answer-before-opening',[answer],false]])test(name,()=>{
 const root=fs.mkdtempSync(path.join(base,'arena-'+name+'-')),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'report.json');fs.mkdirSync(source);
 let prior;
 for(const move of moves)prior=recordSemanticRecord({root:source,objectKind:'work-arena-move',category:'move',record:move,recordedAt:move.at,told:{for:true,against:false},causes:withCause&&prior?prior.events:[]});
 const before=snapshot(source),expected=workBoard(moves,now);
 assert.equal(expected.refused.length,0);assert.equal(expected.unread.length,0);
 const run=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});
 assert.equal(run.status,0,run.stderr);assert.deepEqual(snapshot(source),before);
 const r=JSON.parse(fs.readFileSync(report)),head=store.readHead(output,'work-arena-move',store.threadName(moves[0].thread??moves[0].id));
 const rows=head?[...store.walk(output,'work-arena-move',head.frontier,{limit:256})]:[];
 const named=[...store.heads(output,'work-arena-move')];
 const recordRows=rows.filter(row=>row.record).map(row=>{const{causes,...move}=row.record;return{id:row.address,record:move,causes:causes??[]};});
 const actual=createWorkArenaReader().boardAt(recordRows,now);
 results.push({name,root,qualified:r.qualified,referenceDispositions:r.referenceDispositions,headNames:named.map(x=>x.name),reachable:recordRows.length,expectedStanding:expected.threads[0]?.standing,actualStanding:actual.threads[0]?.standing,originalsUnchanged:true});
 assert.equal(r.referenceDispositions.count,0,'domain thread/law/evidence NI identities are not custody citations');
 assert.ok(head,'opening semantic ID must resolve its native head');
 assert.equal(named.length,1,'one semantic thread has one head');
 assert.ok(rows.every(row=>!row.missing&&!row.truncated));assert.equal(recordRows.length,moves.length);
 assert.deepEqual(recordRows.map(row=>row.record).sort((a,b)=>a.at.localeCompare(b.at)),moves);
 assert.deepEqual(actual,expected);
});
process.on('exit',()=>fs.writeFileSync(path.join(base,'work-conversion-test-results.json'),JSON.stringify(results,null,2)+'\n'));
test('cross-thread semantic relations survive exactly while each thread has complete native custody',()=>{
 const related=moveOf({move:'ask',by:'alice',question:'Which earlier question governs this work?',after:[question.id],relates:[question.id],at:later});
 const root=fs.mkdtempSync(path.join(base,'arena-relations-')),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'report.json');fs.mkdirSync(source);
 for(const move of [question,related])recordSemanticRecord({root:source,objectKind:'work-arena-move',category:'move',record:move,recordedAt:move.at,told:{for:true,against:false}});
 const before=snapshot(source),expected=workBoard([question,related],now);assert.equal(expected.refused.length,0);
 const run=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});assert.equal(run.status,0,run.stderr);assert.deepEqual(snapshot(source),before);
 const r=JSON.parse(fs.readFileSync(report));assert.equal(r.referenceDispositions.count,0);assert.equal(r.qualified,true);
 const all=[];for(const move of [question,related]){const head=store.readHead(output,'work-arena-move',store.threadName(move.id));assert.ok(head);const held=[...store.walk(output,'work-arena-move',head.frontier)];assert.equal(held.length,1);assert.deepEqual(held[0].record,move);all.push({id:held[0].address,record:held[0].record});}
 assert.deepEqual(createWorkArenaReader().boardAt(all,now),expected);
});
test('a typed cross-kind witness cause remains a custody edge without changing arena domain content',()=>{
 const root=fs.mkdtempSync(path.join(base,'arena-cause-')),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'report.json');fs.mkdirSync(source);
 const prior=recordSemanticRecord({root:source,objectKind:'561-group.primary-system-health',category:'primary-system-health',record:{system:'fixture',charge:'held',was:'unknown',message:'source health evidence'},recordedAt:at,told:{for:true,against:false}});
 recordSemanticRecord({root:source,objectKind:'work-arena-move',category:'move',record:question,recordedAt:question.at,told:{for:true,against:false},causes:prior.events});const before=snapshot(source);
 const run=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});assert.equal(run.status,0,run.stderr);assert.deepEqual(snapshot(source),before);
 const r=JSON.parse(fs.readFileSync(report));assert.equal(r.referenceDispositions.count,0);const head=store.readHead(output,'work-arena-move',store.threadName(question.id));assert.ok(head);
 const rows=[...store.walk(output,'work-arena-move',head.frontier)];assert.equal(rows.length,2);assert.ok(rows.every(row=>!row.missing&&!row.truncated));const arena=rows.find(row=>row.type==='work-arena-move');assert.equal(arena.record.causes[0].type,'primary-system-health');const{causes,...move}=arena.record;assert.deepEqual(move,question);
 assert.deepEqual(createWorkArenaReader().boardAt([{id:arena.address,record:move}],now),workBoard([question],now));
});
test('missing arena semantic thread identity remains unqualified instead of receiving a fabricated witness-address head',()=>{
 const root=fs.mkdtempSync(path.join(base,'arena-missing-thread-')),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'report.json');fs.mkdirSync(source);const{id,...withoutId}=question;
 recordSemanticRecord({root:source,objectKind:'work-arena-move',category:'move',record:withoutId,recordedAt:question.at,told:{for:true,against:false}});const before=snapshot(source);
 const run=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});assert.equal(run.status,0,run.stderr);assert.deepEqual(snapshot(source),before);
 const r=JSON.parse(fs.readFileSync(report));assert.equal(r.qualified,false);assert.equal(r.unqualifiedSources['work-arena-thread-unresolved'],1);assert.deepEqual([...store.heads(output,'work-arena-move')],[]);
});
test('a genuinely missing witness cause still produces a cutover-blocking custody disposition',()=>{
 const root=fs.mkdtempSync(path.join(base,'arena-missing-cause-')),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'report.json');fs.mkdirSync(source);
 // First establish genuine causal admission. An absent cause at write time is
 // pending rather than acknowledged under the original writer's contract.
 const complete=path.join(root,'complete');
 const prior=recordSemanticRecord({root:complete,objectKind:'561-group.primary-system-health',category:'primary-system-health',record:{system:'fixture',charge:'held'},recordedAt:at,told:{for:true,against:false}});
 const admitted=recordSemanticRecord({root:complete,objectKind:'work-arena-move',category:'move',record:question,recordedAt:question.at,told:{for:true,against:false},causes:prior.events});assert.equal(admitted.appended,1);
 // Copy the acknowledged arena segment alone to model a custody source whose
 // cited original has gone missing. The complete original fixture is retained.
 const completeBefore=snapshot(complete);fs.cpSync(path.join(complete,'data/logs/work-arena-move-logs'),path.join(source,'data/logs/work-arena-move-logs'),{recursive:true});const before=snapshot(source);
 const run=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});assert.equal(run.status,0,run.stderr);assert.deepEqual(snapshot(source),before);
 const r=JSON.parse(fs.readFileSync(report));assert.equal(r.referenceDispositions.count,1);assert.equal(r.causesDropped,1);const dispositions=fs.readFileSync(path.join(output,r.referenceDispositions.file),'utf8').trim().split('\n').map(JSON.parse);assert.equal(dispositions[0].role,'cause');assert.equal(dispositions[0].reason,'original-cause-unavailable');assert.deepEqual(snapshot(complete),completeBefore);
});

test('distinct witnesses with identical arena content and replay preserve one reachable move without inflating its thread count',()=>{
 const root=fs.mkdtempSync(path.join(base,'arena-duplicate-')),source=path.join(root,'source'),output=path.join(root,'converted'),report=path.join(root,'report.json');fs.mkdirSync(source);
 const witnesses=['first-origin','second-origin'].map(origin=>recordSemanticRecord({root:source,objectKind:'work-arena-move',category:'move',record:question,recordedAt:question.at,told:{for:true,against:false},origin}));
 assert.equal(witnesses[0].id,witnesses[1].id);assert.notEqual(witnesses[0].events[0],witnesses[1].events[0]);assert.ok(witnesses.every(value=>value.appended===1));
 const files=[];const visit=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else if(p.endsWith('.witnesses'))files.push(p);}};visit(source);assert.equal(files.length,1);
 const first=fs.readFileSync(files[0],'utf8').split('\n')[0];fs.appendFileSync(files[0],first+'\n');const before=snapshot(source);
 const run=spawnSync(process.execPath,[converter,'--settlement',source,'--into',output,'--old-store',oldStore,'--new-store',newStore,'--report',report],{encoding:'utf8',timeout:60000});assert.equal(run.status,0,run.stderr);assert.deepEqual(snapshot(source),before);
 const r=JSON.parse(fs.readFileSync(report));assert.equal(r.qualified,true);assert.equal(r.referenceDispositions.count,0);assert.deepEqual(r.types['work-arena-move'],{read:3,written:1,duplicates:1,heads:1,verified:1});
 const head=store.readHead(output,'work-arena-move',store.threadName(question.id));assert.equal(head.frontier.length,1);const rows=[...store.walk(output,'work-arena-move',head.frontier)];assert.equal(rows.length,1);assert.deepEqual(rows[0].record,question);assert.deepEqual(createWorkArenaReader().boardAt([{id:rows[0].address,record:rows[0].record}],now),workBoard([question],now));
});
