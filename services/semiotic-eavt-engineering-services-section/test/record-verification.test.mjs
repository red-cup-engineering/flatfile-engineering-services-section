import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {extend,each,walk,recordVerification} from '../src/store.mjs';
import {recordFile} from '../src/layout.mjs';
import {checkNativeTypes} from '../scripts/check-current-state.mjs';
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'store-verification-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const type='proof-fixture',a=extend(root,type,'original',{value:'parent'}),b=extend(root,type,'original',{value:'child'});
 return{root,type,a,b,files:new Set([recordFile(root,type,a),recordFile(root,type,b)])};
}
function opens(files,read){
 const original=fs.openSync;let count=0;
 fs.openSync=(file,...args)=>{if(files.has(String(file)))count++;return original(file,...args)};
 syncBuiltinESMExports();
 try{return{value:read(),count:()=>count}}finally{fs.openSync=original;syncBuiltinESMExports()}
}
function warm(f,maximumEntries){
 const verification=recordVerification(f.root,maximumEntries===undefined?{}:{maximumEntries});
 [...each(f.root,f.type,{strict:true,verification})];return verification;
}
test('strict discovery supplies proof without rereading bodies for each causal head',t=>{
 const f=fixture(t),v=warm(f);try{
  const fast=opens(f.files,()=>[...walk(f.root,f.type,[f.b],{limit:100000,verifyOnly:true,verification:v})]);
  const ordinary=opens(f.files,()=>[...walk(f.root,f.type,[f.b],{limit:100000,verifyOnly:true})]);
  assert.equal(fast.count(),0);assert.ok(ordinary.count()>0);
  assert.deepEqual(fast.value,ordinary.value);assert.ok(fast.value.every(row=>row.verified===true&&row.record===undefined));
 }finally{v.close()}
});
test('another verified head reuses the same caller-owned proof scope',t=>{
 const f=fixture(t),v=warm(f);try{
  assert.equal(opens(f.files,()=>[...walk(f.root,f.type,[f.a],{verifyOnly:true,verification:v})]).count(),0);
  assert.equal(opens(f.files,()=>[...walk(f.root,f.type,[f.b],{verifyOnly:true,verification:v})]).count(),0);
 }finally{v.close()}
});
test('replaced corrupt bytes invalidate a previously received proof',t=>{
 const f=fixture(t),v=warm(f);try{
  const file=recordFile(f.root,f.type,f.b),changed=file+'.changed';
  fs.writeFileSync(changed,fs.readFileSync(file,'utf8').replace('child','wrong'));fs.renameSync(changed,file);
  assert.ok([...walk(f.root,f.type,[f.b],{verifyOnly:true,verification:v})].some(row=>row.missing===true));
  assert.throws(()=>checkNativeTypes(f.root,[f.type]));
 }finally{v.close()}
});
test('an appended valid row requires a fresh current bucket read',t=>{
 const f=fixture(t),v=warm(f);try{
  const file=recordFile(f.root,f.type,f.b);fs.appendFileSync(file,fs.readFileSync(file));
  const result=opens(f.files,()=>[...walk(f.root,f.type,[f.b],{verifyOnly:true,verification:v})]);
  assert.ok(result.count()>0);assert.ok(result.value.every(row=>row.verified===true));
 }finally{v.close()}
});
test('cache saturation falls back to the original byte verification',t=>{
 const f=fixture(t),v=warm(f,1);try{
  const result=[...walk(f.root,f.type,[f.b],{verifyOnly:true,verification:v})];
  assert.deepEqual(new Set(result.map(x=>x.address)),new Set([f.a,f.b]));
  assert.ok(result.every(x=>x.verified));
 }finally{v.close()}
});
test('a missing causal predecessor cannot be admitted from cached descendants',t=>{
 const f=fixture(t),missing='ni:///sha-256;'+'A'.repeat(43);
 const child=extend(f.root,f.type,'missing-cause',{value:'requires source'},{causes:[missing]});
 const v=warm(f);try{assert.ok([...walk(f.root,f.type,[child],{verifyOnly:true,verification:v})].some(x=>x.missing));assert.throws(()=>checkNativeTypes(f.root,[f.type]),/incomplete/)}finally{v.close()}
});
test('forged, foreign, closed or non-proof verification scopes refuse',t=>{
 const f=fixture(t),other=fixture(t),v=warm(f);
 assert.throws(()=>[...walk(f.root,f.type,[f.b],{verifyOnly:true,verification:{}})],/not owned/);
 assert.throws(()=>[...walk(other.root,other.type,[other.b],{verifyOnly:true,verification:v})],/foreign/);
 assert.throws(()=>[...walk(f.root,f.type,[f.b],{verification:v})],/proof walk/);
 assert.throws(()=>[...each(f.root,f.type,{verification:v})],/strict discovery/);
 v.close();v.close();assert.throws(()=>[...walk(f.root,f.type,[f.b],{verifyOnly:true,verification:v})],/closed/);
});
test('native state receiving still uses the original strict rows, head laws and traversal limit',t=>{
 const f=fixture(t);assert.deepEqual(checkNativeTypes(f.root,[f.type]),{[f.type]:{records:2,heads:1}});
 const v=warm(f);try{assert.ok([...walk(f.root,f.type,[f.b],{limit:1,verifyOnly:true,verification:v})].some(x=>x.truncated))}finally{v.close()}
});

