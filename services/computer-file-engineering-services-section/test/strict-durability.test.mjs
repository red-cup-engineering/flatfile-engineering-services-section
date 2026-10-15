import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

for(const [label,writer]of [["sync",writeFileTextSync],["async",writeFileText]])test(label+" exclusive temp collision never removes foreign temporary or existing destination",async t=>{
 const root=fixture(t),file=join(root,"file"),temporary=join(root,".file."+process.pid+".collision.tmp");
 fs.writeFileSync(file,"destination");fs.writeFileSync(temporary,"foreign retained custody");
 const original=crypto.randomUUID;crypto.randomUUID=()=>"collision";syncBuiltinESMExports();
 try{await assert.rejects(async()=>writer(file,"replacement",{durableRoot:root}),e=>e.code==="EEXIST");}
 finally{crypto.randomUUID=original;syncBuiltinESMExports();}
 assert.equal(fs.readFileSync(file,"utf8"),"destination");
 assert.equal(fs.readFileSync(temporary,"utf8"),"foreign retained custody");
});
for(const [label,writer]of [["sync",writeFileTextSync],["async",writeFileText]])test(label+" uncertain link failure preserves owned source after publication was attempted",async t=>{
 const root=fixture(t),file=join(root,"file");
 if(label==="sync"){
  instrument({linkSync:original=>(...args)=>{original(...args);throw new Error("uncertain link");}},
   ()=>assert.throws(()=>writer(file,"kept",{durableRoot:root,flag:"wx"})));
 }else{
  const original=fsp.link;fsp.link=async(...args)=>{await original(...args);throw new Error("uncertain link");};syncBuiltinESMExports();
  try{await assert.rejects(writer(file,"kept",{durableRoot:root,flag:"wx"}));}
  finally{fsp.link=original;syncBuiltinESMExports();}
 }
 assert.equal(fs.readFileSync(file,"utf8"),"kept");
 const names=fs.readdirSync(root).filter(n=>n.endsWith(".tmp"));assert.equal(names.length,1);
 assert.equal(fs.readFileSync(join(root,names[0]),"utf8"),"kept");
});

import fsp from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

test("strict open refuses truncation flags before touching existing bytes",t=>{
 const root=fixture(t),file=join(root,"file");fs.writeFileSync(file,"kept");
 assert.throws(()=>openDurableFileSync(file,fs.constants.O_WRONLY|fs.constants.O_TRUNC,{durableRoot:root}));
 assert.equal(fs.readFileSync(file,"utf8"),"kept");
});
for(const index of [0,1,2])test("each ancestry fsync failure "+index+" remains uncertain and retry syncs all ancestors",t=>{
 const root=fixture(t),file=join(root,"one","two","file");
 let observed=0;
 track(()=>({fsyncSync:original=>fd=>{
  if(fs.fstatSync(fd).isDirectory()&&observed++===index)throw new Error("injected ancestor");
  return original(fd);
 }}),()=>assert.throws(()=>writeFileTextSync(file,"kept",{durableRoot:root})));
 assert.equal(fs.readFileSync(file,"utf8"),"kept");
 track(()=>({}),(events)=>{
  writeFileTextSync(file,"kept",{durableRoot:root});
  assert.deepEqual(events.filter(e=>e[0]==="sync"&&e[2]).map(e=>e[1]),[dirname(file),dirname(dirname(file)),root]);
 });
});
test("exclusive final cleanup sync failure retains durable destination and reports uncertainty",t=>{
 const root=fixture(t),file=join(root,"file");let count=0;
 track(()=>({fsyncSync:original=>fd=>{
  if(fs.fstatSync(fd).isDirectory()&&++count===2)throw new Error("cleanup uncertain");
  return original(fd);
 }}),()=>assert.throws(()=>writeFileTextSync(file,"kept",{durableRoot:root,flag:"wx"})));
 assert.equal(fs.readFileSync(file,"utf8"),"kept");
 assert.equal(fs.readdirSync(root).some(n=>n.endsWith(".tmp")),false);
 syncFileDurablySync(file,{durableRoot:root});
});

import { assertDurableFilePathSync, openDurableFileSync, syncFileDurablySync, writeFileText, writeFileTextSync, writeFileBytes, writeFileBytesSync } from "../scripts/write-file.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), "strict-file-"));
  t.after(() => fs.rmSync(root, { recursive:true, force:true }));
  return root;
}
function instrument(overrides, work) {
  const saved = {};
  for (const [name, wrap] of Object.entries(overrides)) { saved[name] = fs[name]; fs[name] = wrap(saved[name]); }
  syncBuiltinESMExports();
  try { return work(); }
  finally { for (const [name, value] of Object.entries(saved)) fs[name] = value; syncBuiltinESMExports(); }
}
function track(extra, work) {
  const paths = new Map(), events = [];
  const wrappers = {
    openSync: original => (path, ...args) => { const fd = original(path, ...args); paths.set(fd, path); return fd; },
    fsyncSync: original => fd => { events.push(["sync",paths.get(fd),fs.fstatSync(fd).isDirectory()]); return original(fd); },
    renameSync: original => (from,to) => { events.push(["rename",to]); return original(from,to); },
    linkSync: original => (from,to) => { events.push(["link",to]); return original(from,to); },
    unlinkSync: original => path => { events.push(["unlink",path]); return original(path); },
    ...extra(paths,events)
  };
  return instrument(wrappers, () => work(events,paths));
}

test("strict text/byte synchronous/asynchronous writers retain modes and full nested contents", async t => {
  const root=fixture(t);
  for (const [i,writer] of [writeFileTextSync,writeFileText,writeFileBytesSync,writeFileBytes].entries()) {
    const file=join(root,"a","b","file"+i), bytes="é".repeat(4096);
    await writer(file,i<2?bytes:Buffer.from(bytes),{durableRoot:root,mode:0o600});
    assert.equal(fs.readFileSync(file,"utf8"),bytes);
    assert.equal(fs.statSync(file).mode&0o777,0o600);
    await assert.rejects(async()=>writer(file,i<2?"new":Buffer.from("new"),{durableRoot:root,flag:"wx"}),e=>e.code==="EEXIST");
    assert.equal(fs.readFileSync(file,"utf8"),bytes);
  }
});
test("strict preflight rejects missing/relative/null/outside anchors before creating parents", t => {
  const root=fixture(t), target=join(root,"untouched","file");
  for (const anchor of [null,"relative",join(root,"absent"),join(root,"other")]) {
    assert.throws(()=>writeFileTextSync(target,"x",{durableRoot:anchor}));
    assert.equal(fs.existsSync(dirname(target)),false);
  }
  fs.mkdirSync(join(root,"anchor"));
  assert.throws(()=>writeFileTextSync(target,"x",{durableRoot:join(root,"anchor")}));
  assert.equal(fs.existsSync(dirname(target)),false);
});
test("strict preflight refuses redirected ancestor and leaf without changing target", t => {
  const root=fixture(t), real=join(root,"real");fs.mkdirSync(real);
  fs.writeFileSync(join(real,"file"),"old");
  fs.symlinkSync(real,join(root,"alias"));
  assert.throws(()=>writeFileTextSync(join(root,"alias","file"),"new",{durableRoot:root}));
  assert.throws(()=>assertDurableFilePathSync(join(real,"new"),{durableRoot:join(root,"alias")}));
  fs.symlinkSync(join(real,"file"),join(root,"leaf"));
  assert.throws(()=>writeFileTextSync(join(root,"leaf"),"new",{durableRoot:root}));
  assert.equal(fs.readFileSync(join(real,"file"),"utf8"),"old");
});
test("actual descriptor device and type are verified before caller receives it", t => {
  const root=fixture(t),file=join(root,"file");fs.writeFileSync(file,"old");
  track((paths)=>({fstatSync:original=>fd=>{
    const stat=original(fd);
    if(paths.get(fd)===file)return Object.assign(Object.create(stat),{dev:stat.dev+1});
    return stat;
  }}),()=>assert.throws(()=>openDurableFileSync(file,fs.constants.O_RDWR,{durableRoot:root})));
  assert.equal(fs.readFileSync(file,"utf8"),"old");
});
test("barrier synchronizes every existing directory bottom-up on every call", t => {
  const root=fixture(t),file=join(root,"one","two","file");fs.mkdirSync(dirname(file),{recursive:true});fs.writeFileSync(file,"old");
  for(let repeat=0;repeat<2;repeat++)track(()=>({}),(events)=>{
    syncFileDurablySync(file,{durableRoot:root});
    assert.deepEqual(events.filter(e=>e[0]==="sync"&&e[2]).map(e=>e[1]),[dirname(file),dirname(dirname(file)),root]);
    assert.equal(events[0][1],file);
  });
});
test("strict exclusive publication retains source link until durable destination and then syncs cleanup", t => {
  const root=fixture(t),file=join(root,"nested","file");
  track(()=>({}),(events)=>{
    writeFileTextSync(file,"whole",{durableRoot:root,flag:"wx"});
    const link=events.findIndex(e=>e[0]==="link"),unlink=events.findIndex(e=>e[0]==="unlink");
    assert.ok(link>=0&&unlink>link);
    assert.deepEqual(events.slice(link+1,unlink).filter(e=>e[0]==="sync"&&e[2]).map(e=>e[1]),[dirname(file),root]);
    assert.deepEqual(events.slice(unlink+1).filter(e=>e[0]==="sync"&&e[2]).map(e=>e[1]),[dirname(file),root]);
  });
});
for(const stage of ["mkdir","write","file-sync","rename","directory-sync"])test("strict failure at "+stage+" preserves old or uncertain published content",t=>{
  const root=fixture(t),file=join(root,"file");fs.writeFileSync(file,"old");
  let fired=false;
  track((paths,events)=>{
    const fail=()=>{fired=true;throw Object.assign(new Error("injected"),{code:"EIO"});};
    if(stage==="mkdir")return{mkdirSync:()=>()=>fail()};
    if(stage==="write")return{writeFileSync:original=>(fd,...args)=>{original(fd,"prefix");return fail();}};
    if(stage==="file-sync"||stage==="directory-sync")return{fsyncSync:original=>fd=>{
      const directory=fs.fstatSync(fd).isDirectory();
      if(directory===(stage==="directory-sync"))return fail();
      return original(fd);
    }};
    return{renameSync:()=>()=>fail()};
  },()=>assert.throws(()=>writeFileTextSync(file,"new",{durableRoot:root}),e=>e.code==="EIO"));
  assert.equal(fired,true);
  assert.equal(fs.readFileSync(file,"utf8"),stage==="directory-sync"?"new":"old");
  // An uncertain new head is re-published through the same complete barrier path.
  writeFileTextSync(file,"new",{durableRoot:root});assert.equal(fs.readFileSync(file,"utf8"),"new");
});
test("strict exclusive post-link fsync failure retains both payload links; unlink failure is uncertain",t=>{
  const root=fixture(t);
  for(const failure of ["sync","unlink"]){
    const file=join(root,failure);
    track(()=>failure==="sync"?{fsyncSync:original=>fd=>{if(fs.fstatSync(fd).isDirectory())throw Object.assign(new Error("injected"),{code:"EINVAL"});return original(fd);}}:{unlinkSync:()=>()=>{throw new Error("injected");}},
      ()=>assert.throws(()=>writeFileTextSync(file,"kept",{durableRoot:root,flag:"wx"})));
    assert.equal(fs.readFileSync(file,"utf8"),"kept");
    assert.ok(fs.readdirSync(root).some(n=>n.startsWith("."+failure+".")&&n.endsWith(".tmp")));
  }
});
test("directory fsync unsupported is refused strictly and keeps default compatibility",t=>{
  const root=fixture(t);
  instrument({fsyncSync:original=>fd=>{if(fs.fstatSync(fd).isDirectory())throw Object.assign(new Error("unsupported"),{code:"EINVAL"});return original(fd);}},()=>{
    writeFileTextSync(join(root,"default"),"default");
    assert.throws(()=>writeFileTextSync(join(root,"strict"),"strict",{durableRoot:root}),e=>e.code==="EINVAL");
  });
});
test("async strict mode propagates unsupported directory sync and retains published bytes",async t=>{
  const root=fixture(t),file=join(root,"file"),original=fsp.open;
  fsp.open=async(...args)=>{
    const handle=await original(...args),stat=await handle.stat();
    if(stat.isDirectory())handle.sync=async()=>{throw Object.assign(new Error("unsupported"),{code:"EINVAL"});};
    return handle;
  };syncBuiltinESMExports();
  try{await assert.rejects(writeFileText(file,"kept",{durableRoot:root}),e=>e.code==="EINVAL");}
  finally{fsp.open=original;syncBuiltinESMExports();}
  assert.equal(fs.readFileSync(file,"utf8"),"kept");
});

