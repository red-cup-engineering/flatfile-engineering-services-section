import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,appendFileSync,symlinkSync,opendirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {put,each,heads,readHead,writeHead,walk,extend,StoreCorruption} from '../src/store.mjs';
import {recordFile,headFile,stateDirectory} from '../src/layout.mjs';
const rootOf=t=>{const root=mkdtempSync(join(tmpdir(),'store-strict-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;};
test('strict discovery agrees on complete records and heads and genuine absence',t=>{
 const root=rootOf(t),address=put(root,'claim',{value:'held'});writeHead(root,'claim','one',{frontier:[address]});
 assert.deepEqual([...each(root,'claim',{strict:true})],[...each(root,'claim')]);
 assert.deepEqual([...heads(root,'claim',{strict:true})],[...heads(root,'claim')]);
 assert.deepEqual([...heads(root,'absent',{strict:true})],[]);
});
test('strict heads refuse malformed JSON and invalid frontiers without changing permissive defaults',t=>{
 const root=rootOf(t),file=headFile(root,'claim','broken');mkdirSync(dirname(file),{recursive:true});writeFileSync(file,'{bad');
 assert.deepEqual([...heads(root,'claim')],[]);assert.throws(()=>[...heads(root,'claim',{strict:true})]);
 writeFileSync(file,JSON.stringify({frontier:['not-an-address']}));assert.equal([...heads(root,'claim')].length,1);assert.throws(()=>[...heads(root,'claim',{strict:true})]);
});
test('strict records refuse malformed and hash-invalid content',t=>{
 const root=rootOf(t),address=put(root,'claim',{value:'held'}),file=recordFile(root,'claim',address);
 for(const text of ['{bad\n',JSON.stringify({id:address,record:{value:'changed'}})+'\n',JSON.stringify({x:'not-a-record'})+'\n']){
  writeFileSync(file,text);assert.deepEqual([...each(root,'claim')],[]);assert.throws(()=>[...each(root,'claim',{strict:true})],StoreCorruption);
 }
});
test('strict records refuse incomplete and overlong lines without quoting their contents',t=>{
 const root=rootOf(t),address=put(root,'claim',{value:'held'}),file=recordFile(root,'claim',address);
 for(const text of ['private-fragment','private-fragment'.repeat(6000)+'\n']){
  writeFileSync(file,text);assert.deepEqual([...each(root,'claim')],[]);assert.throws(()=>[...each(root,'claim',{strict:true})],e=>e instanceof StoreCorruption&&!e.message.includes('private-fragment'));
 }
});
test('partial strict iteration never certifies the yielded prefix as complete',t=>{
 const root=rootOf(t),address=put(root,'claim',{value:'held'});appendFileSync(recordFile(root,'claim',address),'{bad\n');
 const iterator=each(root,'claim',{strict:true});assert.equal(iterator.next().value.address,address);assert.throws(()=>iterator.next(),StoreCorruption);
});
test('strict heads refuse nonregular entries and symbolic leaf links',t=>{
 const root=rootOf(t),file=headFile(root,'claim','directory');mkdirSync(file,{recursive:true});assert.throws(()=>[...heads(root,'claim',{strict:true})],StoreCorruption);
 rmSync(file,{recursive:true});const target=join(root,'target');writeFileSync(target,JSON.stringify({frontier:[]}));symlinkSync(target,file);
 assert.equal([...heads(root,'claim')].length,1);assert.throws(()=>[...heads(root,'claim',{strict:true})],e=>e instanceof StoreCorruption||e.code==='ELOOP');
});
test('strict discovery propagates unavailable paths instead of empty ENOTDIR evidence',t=>{
 const root=rootOf(t),directory=stateDirectory(root,'claim');mkdirSync(dirname(directory),{recursive:true});writeFileSync(directory,'not-directory');
 assert.deepEqual([...heads(root,'claim')],[]);assert.throws(()=>[...heads(root,'claim',{strict:true})],e=>e.code==='ENOTDIR');
});
test('named head replacement and missing records stay observable independently',t=>{
 const root=rootOf(t),a=put(root,'claim',{value:'held'}),b=put(root,'claim',{value:'denied'});writeHead(root,'claim','one',{frontier:[a]});
 const before=readHead(root,'claim','one');writeHead(root,'claim','one',{frontier:[b]});assert.notDeepEqual(readHead(root,'claim','one'),before);
 rmSync(recordFile(root,'claim',b));assert.deepEqual([...walk(root,'claim',[b])],[{address:b,type:'claim',missing:true}]);assert.deepEqual(readHead(root,'claim','one').frontier,[b]);
});
test('walk reports a cause removed after traversal rather than silently omitting its evidence',t=>{
 const root=rootOf(t),first=extend(root,'claim','one',{value:'grant'}),denial=extend(root,'claim','one',{value:'denied'}),last=extend(root,'claim','one',{value:'unrelated'});
 const rows=walk(root,'claim',[last]);assert.equal(rows.next().value.address,last);
 rmSync(recordFile(root,'claim',denial));
 assert.deepEqual(rows.next().value,{address:denial,type:'claim',missing:true});assert.equal(rows.next().value.address,first);assert.equal(rows.next().done,true);
});
test('strict record discovery refuses directory and symbolic leaf entries',t=>{
 const root=rootOf(t),address=put(root,'claim',{value:'held'}),file=recordFile(root,'claim',address);
 rmSync(file);mkdirSync(file);assert.throws(()=>[...each(root,'claim',{strict:true})],StoreCorruption);
 rmSync(file,{recursive:true});const target=join(root,'target');writeFileSync(target,'');symlinkSync(target,file);
 assert.throws(()=>[...each(root,'claim',{strict:true})],e=>e instanceof StoreCorruption||e.code==='ELOOP');
});
test('an unreadable directory traversal preserves the filesystem error code',t=>{
 const root=rootOf(t),directory=stateDirectory(root,'claim');mkdirSync(dirname(directory),{recursive:true});symlinkSync(directory,directory);
 let native;try{opendirSync(directory);}catch(error){native=error;}assert.ok(native);
 assert.throws(()=>[...heads(root,'claim',{strict:true})],e=>e.name===native.name&&e.message===native.message&&e.code===native.code&&e.errno===native.errno);
});
test('a second-process replacement during enumeration requires the consumer final named-head check',t=>{
 const root=rootOf(t),a=put(root,'claim',{value:'held'}),b=put(root,'claim',{value:'denied'});writeHead(root,'claim','one',{frontier:[a]});writeHead(root,'claim','two',{frontier:[a]});
 const iterator=heads(root,'claim',{strict:true}),first=iterator.next().value;
 execFileSync(process.execPath,['--input-type=module','--eval',`import {writeHead} from './src/store.mjs';writeHead(${JSON.stringify(root)},'claim',${JSON.stringify(first.name)},{frontier:[${JSON.stringify(b)}]});`],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
 assert.equal([...iterator].length,1);assert.notDeepEqual(readHead(root,'claim',first.name),first.head);
});
