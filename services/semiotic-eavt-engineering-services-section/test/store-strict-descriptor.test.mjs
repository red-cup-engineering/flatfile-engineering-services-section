import test from 'node:test';
import {execFileSync} from 'node:child_process';
for(const kind of ['record','head'])for(const replacement of ['symlink','fifo']){
 test(`strict ${kind} refuses ${replacement} swapped at the actual open/read boundary`,()=>{
  const code=`
   import fs from 'node:fs';import assert from 'node:assert/strict';import {syncBuiltinESMExports} from 'node:module';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
   import {put,writeHead,each,heads} from './src/store.mjs';import {recordFile,headFile} from './src/layout.mjs';
   const root=fs.mkdtempSync(join(tmpdir(),'strict-descriptor-'));
   try{
    const address=put(root,'claim',{value:'fixture'});writeHead(root,'claim','one',{frontier:[address]});
    const file=${JSON.stringify(kind)}==='record'?recordFile(root,'claim',address):headFile(root,'claim','one');
    const target=join(root,'target');fs.copyFileSync(file,target);
    const open=fs.openSync,read=fs.readFileSync;let armed=true;
    const replace=p=>{if(armed&&p===file){armed=false;fs.rmSync(file);if(${JSON.stringify(replacement)}==='symlink')fs.symlinkSync(target,file);else execFileSync('mkfifo',[file]);}};
    fs.openSync=(...args)=>{replace(args[0]);return open(...args);};fs.readFileSync=(...args)=>{replace(args[0]);return read(...args);};syncBuiltinESMExports();
    assert.throws(()=>[...(${JSON.stringify(kind)}==='record'?each(root,'claim',{strict:true}):heads(root,'claim',{strict:true}))]);assert.equal(armed,false);
   }finally{fs.rmSync(root,{recursive:true,force:true});}
  `;
  execFileSync(process.execPath,['--input-type=module','--eval',code],{cwd:new URL('..',import.meta.url),stdio:'pipe',timeout:5000});
 });
}
