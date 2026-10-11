import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,mkdirSync,symlinkSync,readdirSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {openFullTextIndex} from '../src/vault/full-text-index.mjs';
const temporary=body=>{const dir=mkdtempSync(join(tmpdir(),'native-markdown-index-'));try{body(dir);}finally{rmSync(dir,{recursive:true,force:true});}};
const snapshot=root=>{const files={};if(!existsSync(root))return files;const visit=dir=>{for(const name of readdirSync(dir)){const file=join(dir,name),stat=lstatSync(file);if(stat.isDirectory())visit(file);else files[relative(root,file)]=createHash('sha256').update(readFileSync(file)).digest('hex');}};visit(root);return files;};
const refuse=(options,file)=>assert.throws(()=>openFullTextIndex(options),error=>error.code==='ERR_HISTORICAL_FULL_TEXT_INDEX_UNRECEIVED'&&error.path===file);
for(const [label,bytes] of [['SQLite signature',Buffer.from('SQLite format 3\0historical bytes')],['opaque original',Buffer.from('unresolved prior index')],['empty original',Buffer.alloc(0)]]){
 test(`${label} refuses before creating a journal and conserves exact bytes`,()=>temporary(dir=>{
  const file=join(dir,'index.sqlite');writeFileSync(file,bytes);refuse({file},file);assert.deepEqual(readFileSync(file),bytes);assert.equal(existsSync(`${file}.journal`),false);
 }));
}
for(const suffix of ['-wal','-shm','-journal']){
 test(`orphan ${suffix} refuses without inventing an empty primary or journal`,()=>temporary(dir=>{
  const file=join(dir,'index.sqlite'),sidecar=file+suffix,bytes=Buffer.from('original sidecar');writeFileSync(sidecar,bytes);refuse({file},sidecar);assert.deepEqual(readFileSync(sidecar),bytes);assert.equal(existsSync(file),false);assert.equal(existsSync(`${file}.journal`),false);
 }));
 test(`empty ${suffix} still refuses without mutation`,()=>temporary(dir=>{
  const file=join(dir,'index.sqlite'),sidecar=file+suffix;writeFileSync(sidecar,'');refuse({file},sidecar);assert.equal(readFileSync(sidecar).length,0);assert.equal(existsSync(`${file}.journal`),false);
 }));
}
test('directory at the unresolved file locator is refused without mutation',()=>temporary(dir=>{
 const file=join(dir,'index.sqlite');mkdirSync(file);writeFileSync(join(file,'original'),'kept');refuse({file},file);assert.equal(readFileSync(join(file,'original'),'utf8'),'kept');assert.equal(existsSync(`${file}.journal`),false);
}));
test('dangling symlink at the unresolved file locator is not mistaken for absence',()=>temporary(dir=>{
 const file=join(dir,'index.sqlite'),target=join(dir,'missing');symlinkSync(target,file);refuse({file},file);assert.equal(lstatSync(file).isSymbolicLink(),true);assert.equal(existsSync(target),false);assert.equal(existsSync(`${file}.journal`),false);
}));
test('an unresolved original cannot reset or append to an existing native frontier',()=>temporary(dir=>{
 const file=join(dir,'index.sqlite'),root=join(dir,'native');const first=openFullTextIndex({root});first.revise(({put})=>{put('a.md','r17','cedar native');put('b.md','r9','salt');});first.close();
 // A normal native reopen may create its derived segment-verification cache.
 const warmed=openFullTextIndex({root});assert.equal(warmed.revisionOf("a.md"),"r17");warmed.close();
 const before=snapshot(root),bytes=Buffer.from('SQLite format 3\0preserve original');writeFileSync(file,bytes);refuse({root,file},file);assert.deepEqual(snapshot(root),before);assert.deepEqual(readFileSync(file),bytes);
 const reopened=openFullTextIndex({root});assert.equal(reopened.revisionOf('a.md'),'r17');assert.equal(reopened.revisionOf('b.md'),'r9');assert.deepEqual(reopened.search('cedar').map(x=>x.path),['a.md']);assert.deepEqual(snapshot(root),before);
}));
test('absent file locator keeps the exact native journal frontier on reopen',()=>temporary(dir=>{
 const file=join(dir,'index.sqlite');const first=openFullTextIndex({file});first.revise(({put})=>put('a.md','r1','cedar'));first.close();const again=openFullTextIndex({file});assert.equal(again.root,`${file}.journal`);assert.equal(again.revisionOf('a.md'),'r1');again.revise(({put})=>put('a.md','r2','salt'));assert.equal(openFullTextIndex({file}).revisionOf('a.md'),'r2');assert.equal(existsSync(file),false);
}));
test('explicit in-memory compatibility remains native and ephemeral',()=>{
 const index=openFullTextIndex({file:':memory:'});index.revise(({put})=>put('a.md','r1','cedar'));assert.equal(index.root,null);assert.equal(index.revisionOf('a.md'),'r1');assert.equal(openFullTextIndex({file:':memory:'}).size,0);
});

for (const suffix of ['', '-wal', '-shm', '-journal']) {
 test(`supplied historical callback is not invoked before refusal of ${suffix || 'primary'}`,()=>temporary(dir=>{
  const file=join(dir,'index.sqlite'),carrier=file+suffix,root=join(dir,'native'),bytes=Buffer.from('SQLite format 3\0original carrier');
  writeFileSync(carrier,bytes);let callbacks=0;
  refuse({file,root,readLegacySqlite(){callbacks++;throw Error('callback must remain closed');}},carrier);
  assert.equal(callbacks,0);assert.deepEqual(readFileSync(carrier),bytes);assert.equal(existsSync(root),false);assert.equal(existsSync(`${file}.journal`),false);
 }));
}
test('a supplied historical callback cannot alter an existing native frontier',()=>temporary(dir=>{
 const root=join(dir,'native'),file=join(dir,'index.sqlite');const first=openFullTextIndex({root});first.revise(({put})=>put('kept.md','r19','preserved'));first.close();const warm=openFullTextIndex({root});warm.close();
 const before=snapshot(root),bytes=Buffer.from('SQLite format 3\0original');writeFileSync(file,bytes);let callbacks=0;
 refuse({file,root,readLegacySqlite(){callbacks++;return [];}},file);
 assert.equal(callbacks,0);assert.deepEqual(snapshot(root),before);assert.deepEqual(readFileSync(file),bytes);assert.equal(openFullTextIndex({root}).revisionOf('kept.md'),'r19');
}));
