import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

test("bounded head preserves original JSON-owner BOM refusal",t=>{
 const root=fixture(t);installHead(root,Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from('{"frontier":[]}')]));
 assert.throws(()=>readHead(root,"fact","bounded"));
 assert.throws(()=>readHead(root,"fact","bounded",{maxBytes:8192}));
});

import { put, get, writeHead, readHead, extend, HeadConflict } from "../src/store.mjs";
import { recordFile, headFile } from "../src/layout.mjs";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

function fixture(t){const root=fs.mkdtempSync(join(tmpdir(),"durable-store-"));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function patch(wrappers,work){
 const saved={};for(const [key,wrapper]of Object.entries(wrappers)){saved[key]=fs[key];fs[key]=wrapper(saved[key]);}
 syncBuiltinESMExports();try{return work();}finally{for(const[key,value]of Object.entries(saved))fs[key]=value;syncBuiltinESMExports();}
}
function observe(extra,work){
 const paths=new Map(),events=[];
 return patch({
  openSync:original=>(file,...args)=>{const fd=original(file,...args);paths.set(fd,file);events.push(["open",file,args[0]]);return fd;},
  fsyncSync:original=>fd=>{events.push(["sync",paths.get(fd),fs.fstatSync(fd).isDirectory()]);return original(fd);},
  writeSync:original=>(fd,...args)=>{events.push(["write",paths.get(fd)]);return original(fd,...args);},
  renameSync:original=>(from,to)=>{events.push(["rename",to]);return original(from,to);},
  ...extra(paths,events)
 },()=>work(events,paths));
}
function chain(file,root){const result=[];for(let d=dirname(file);;d=dirname(d)){result.push(d);if(d===root)return result;}}
test("strict put and existing-address retry establish the whole ancestry without a second append",t=>{
 const root=fixture(t),record={value:"one"},address=semanticId(record),file=recordFile(root,"fact",address);
 for(let attempt=0;attempt<2;attempt++)observe(()=>({}),(events)=>{
  assert.equal(put(root,"fact",record,{durableRoot:root}),address);
  assert.deepEqual(get(root,"fact",address),record);
  assert.deepEqual(events.filter(e=>e[0]==="sync"&&e[2]).map(e=>e[1]),chain(file,root));
  assert.equal(events.filter(e=>e[0]==="write"&&e[1]===file).length,attempt===0?1:0);
 });
 assert.equal(fs.readFileSync(file,"utf8").split("\n").length,2);
});
test("strict root may be a descendant of an explicit durable anchor, never implicitly its own anchor",t=>{
 const anchor=fixture(t),root=join(anchor,"new","settlement");
 const address=put(root,"fact",{one:1},{durableRoot:anchor});assert.deepEqual(get(root,"fact",address),{one:1});
 assert.throws(()=>put(join(anchor,"bad"),"fact",{one:1},{durableRoot:join(anchor,"missing")}));
 assert.equal(fs.existsSync(join(anchor,"bad")),false);
});
test("strict store refusals precede data and lock-parent creation",t=>{
 const anchor=fixture(t),root=join(anchor,"untouched"),outside=fixture(t);
 for(const operation of [()=>put(root,"fact",{x:1},{durableRoot:outside}),()=>writeHead(root,"fact","h",{frontier:[]},{durableRoot:outside}),()=>extend(root,"fact","h",{x:1},{durableRoot:outside})]){
  assert.throws(operation);assert.equal(fs.existsSync(root),false);
 }
});
for(const kind of ["symlink","fifo","directory"])test("strict existing bucket refuses "+kind+" before read/append",t=>{
 const root=fixture(t),record={x:1},file=recordFile(root,"fact",semanticId(record));
 fs.mkdirSync(dirname(file),{recursive:true});
 const target=join(root,"untouched");fs.writeFileSync(target,"old");
 if(kind==="symlink")fs.symlinkSync(target,file);else if(kind==="fifo")execFileSync("mkfifo",[file]);else fs.mkdirSync(file);
 let writes=0;
 patch({writeSync:original=>(...args)=>{writes++;return original(...args);}},()=>assert.throws(()=>put(root,"fact",record,{durableRoot:root})));
 assert.equal(writes,0);assert.equal(fs.readFileSync(target,"utf8"),"old");
});
test("strict bucket actual-descriptor device mismatch refuses before writing",t=>{
 const root=fixture(t),record={x:1},file=recordFile(root,"fact",semanticId(record));
 let writes=0;
 observe((paths)=>({
  fstatSync:original=>fd=>{const stat=original(fd);return paths.get(fd)===file?Object.assign(Object.create(stat),{dev:stat.dev+1}):stat;},
  writeSync:original=>(...args)=>{writes++;return original(...args);}
 }),()=>assert.throws(()=>put(root,"fact",record,{durableRoot:root})));
 assert.equal(writes,0);
});
test("short append is one refused write; retry preserves fragment and full record identity",t=>{
 const root=fixture(t),record={x:1},address=semanticId(record),file=recordFile(root,"fact",address);let calls=0;
 observe((paths)=>({writeSync:original=>(fd,buffer,...args)=>{
  if(paths.get(fd)!==file)return original(fd,buffer,...args);
  calls++;return original(fd,buffer,0,Math.floor(buffer.length/2));
 }}),()=>assert.throws(()=>put(root,"fact",record,{durableRoot:root}),e=>e.code==="short-write"));
 assert.equal(calls,1);const fragment=fs.readFileSync(file);
 assert.equal(put(root,"fact",record,{durableRoot:root}),address);
 assert.deepEqual(fs.readFileSync(file).subarray(0,fragment.length),fragment);
 assert.deepEqual(get(root,"fact",address),record);
});
test("record fsync failure is uncertain; retry reestablishes already-visible record barriers",t=>{
 const root=fixture(t),record={x:2},address=semanticId(record),file=recordFile(root,"fact",address);
 observe((paths)=>({fsyncSync:original=>fd=>{if(paths.get(fd)===file)throw Object.assign(new Error("injected"),{code:"EIO"});return original(fd);}}),
  ()=>assert.throws(()=>put(root,"fact",record,{durableRoot:root}),e=>e.code==="EIO"));
 assert.deepEqual(get(root,"fact",address),record);
 observe(()=>({}),(events)=>{
  put(root,"fact",record,{durableRoot:root});
  assert.equal(events.filter(e=>e[0]==="write").length,0);
  assert.deepEqual(events.filter(e=>e[0]==="sync"&&e[2]).map(e=>e[1]),chain(file,root));
 });
});
test("strict heads preserve at/closed, expectation refusal and original umask-derived mode",t=>{
 const root=fixture(t),a=put(root,"fact",{x:1},{durableRoot:root}),head={frontier:[a],at:"2026-01-01T00:00:00.000Z",closed:true},old=process.umask(0o077);
 try{writeHead(root,"fact","h",head,{expect:null,durableRoot:root});}
 finally{process.umask(old);}
 assert.equal(fs.statSync(headFile(root,"fact","h")).mode&0o777,0o600);
 assert.deepEqual(readHead(root,"fact","h"),{name:"h",...head});
 assert.throws(()=>writeHead(root,"fact","h",{frontier:[]},{expect:null,durableRoot:root}),HeadConflict);
 const before=fs.readFileSync(headFile(root,"fact","h"),"utf8");
 writeHead(root,"fact","h",readHead(root,"fact","h"),{expect:[a],durableRoot:root});
 assert.equal(fs.readFileSync(headFile(root,"fact","h"),"utf8"),before);
});
for(const kind of ["head","lock"])test("strict head "+kind+" leaf redirection refuses before modifying target",t=>{
 const root=fixture(t),file=headFile(root,"fact","h"),target=join(root,"target");
 fs.mkdirSync(dirname(file),{recursive:true});fs.writeFileSync(target,'{"frontier":[]}');
 fs.symlinkSync(target,kind==="head"?file:file+".lock");
 assert.throws(()=>writeHead(root,"fact","h",{frontier:[]},{durableRoot:root}));
 assert.equal(fs.readFileSync(target,"utf8"),'{"frontier":[]}');
});
for(const strict of [false,true])for(const stage of ["partial-temp","temp-sync","rename","after-rename-sync"])test((strict?"strict":"ordinary")+" head "+stage+" failure never claims a completed transaction",t=>{
 const root=fixture(t),a=put(root,"fact",{x:1}),b=put(root,"fact",{x:2}),file=headFile(root,"fact","h");
 writeHead(root,"fact","h",{frontier:[a],at:"old"});
 const original=fs.readFileSync(file,"utf8");let renamed=false;
 observe((paths)=>{
  if(stage==="partial-temp")return{writeFileSync:original=>(fd)=>{original(fd,'{"partial":');throw new Error("injected");}};
  if(stage==="rename")return{renameSync:()=>()=>{throw new Error("injected");}};
  return{renameSync:original=>(from,to)=>{const result=original(from,to);renamed=true;return result;},fsyncSync:original=>fd=>{
   const directory=fs.fstatSync(fd).isDirectory();
   if((stage==="temp-sync"&&!directory)||(stage==="after-rename-sync"&&renamed&&directory))throw new Error("injected");
   return original(fd);
  }};
 },()=>assert.throws(()=>writeHead(root,"fact","h",{frontier:[b],at:"new"},{expect:[a],...(strict?{durableRoot:root}:{})})));
 if(stage!=="after-rename-sync")assert.equal(fs.readFileSync(file,"utf8"),original);
 else assert.deepEqual(readHead(root,"fact","h").frontier,[b]);
});
test("ordinary large head never publishes a short write as an acknowledged frontier",t=>{
 const root=fixture(t),a=put(root,"fact",{initial:true}),file=headFile(root,"fact","h");
 writeHead(root,"fact","h",{frontier:[a],at:"old",closed:true});
 const original=fs.readFileSync(file),frontier=Array.from({length:1650},(_,n)=>semanticId({n}));
 assert.ok(Buffer.byteLength(JSON.stringify({frontier}))>65536);
 let injected=false;
 observe((paths)=>({
  // The old one-write publisher would accept this positive short return.
  writeSync:original=>(fd,data,...args)=>{
   if(!String(paths.get(fd)).endsWith('.tmp'))return original(fd,data,...args);
   injected=true;const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);
   return original(fd,bytes,0,Math.min(65536,bytes.length));
  },
  // File's complete-write boundary refuses capacity failure after a prefix.
  writeFileSync:original=>(fd,data,...args)=>{
   if(!String(paths.get(fd)).endsWith('.tmp'))return original(fd,data,...args);
   injected=true;fs.writeSync(fd,Buffer.from(data).subarray(0,65536));
   throw Object.assign(new Error('injected full-volume partial write'),{code:'ENOSPC'});
  },
 }),()=>assert.throws(()=>writeHead(root,"fact","h",{frontier,at:"new"},{expect:[a]})));
 assert.equal(injected,true);assert.deepEqual(fs.readFileSync(file),original);
 assert.deepEqual(readHead(root,"fact","h"),{name:"h",frontier:[a],at:"old",closed:true});
 writeHead(root,"fact","h",{frontier,at:"new"},{expect:[a]});
 assert.deepEqual(readHead(root,"fact","h"),{name:"h",frontier:frontier.sort(),at:"new"});
 assert.equal(fs.readFileSync(file).at(-1),10);
});
test("uncertain terminal publication cannot clean claim until record and head barriers are repeated",t=>{
 const root=fixture(t),pending=put(root,"fact",{state:"pending"}),terminal={state:"returned",pending},done=put(root,"fact",terminal),file=headFile(root,"fact","h"),claim=join(root,"claim");
 fs.writeFileSync(claim,"payload");writeHead(root,"fact","h",{frontier:[pending],at:"old"});
 let renamed=false;
 observe(()=>({renameSync:original=>(...args)=>{const result=original(...args);renamed=true;return result;},fsyncSync:original=>fd=>{if(renamed&&fs.fstatSync(fd).isDirectory())throw new Error("injected");return original(fd);}}),
  ()=>assert.throws(()=>writeHead(root,"fact","h",{frontier:[done],at:"terminal",closed:true},{expect:[pending],durableRoot:root})));
 assert.equal(fs.existsSync(claim),true);const visible=readHead(root,"fact","h");
 observe(()=>({}),(events)=>{
  assert.equal(put(root,"fact",terminal,{durableRoot:root}),done);
  writeHead(root,"fact","h",visible,{expect:[done],durableRoot:root});
  assert.deepEqual(readHead(root,"fact","h"),visible);
  assert.ok(events.some(e=>e[0]==="sync"&&e[1]===root));
  fs.unlinkSync(claim);const fd=fs.openSync(root,"r");try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 });
 assert.equal(fs.existsSync(claim),false);
});
test("strict extend orders durable record before durable head and leaves no persistent auxiliary authority",t=>{
 const root=fixture(t);
 observe(()=>({}),(events)=>{
  const address=extend(root,"fact","h",{x:1},{durableRoot:root,closed:true});
  assert.deepEqual(readHead(root,"fact","h").frontier,[address]);
  const rename=events.findIndex(e=>e[0]==="rename");
  const recordSync=events.findIndex(e=>e[0]==="sync"&&e[1]===recordFile(root,"fact",address));
  assert.ok(recordSync>=0&&rename>recordSync);
  assert.equal(fs.existsSync(headFile(root,"fact","h")+".lock"),false);
 });
});
function installHead(root,text){const file=headFile(root,"fact","bounded");fs.mkdirSync(dirname(file),{recursive:true});fs.writeFileSync(file,text);return file;}
test("bounded head admits exactly 8192 bytes including UTF-8 and refuses one byte over",t=>{
 const root=fixture(t);
 for(const text of ['{"frontier":[]}','{"frontier":[],"label":"é🙂"}']){
  const exact=text+" ".repeat(8192-Buffer.byteLength(text));
  assert.equal(Buffer.byteLength(exact),8192);installHead(root,exact);
  assert.deepEqual(readHead(root,"fact","bounded",{maxBytes:8192}),JSON.parse(text));
  installHead(root,exact+" ");assert.throws(()=>readHead(root,"fact","bounded",{maxBytes:8192}),e=>e.code==="head-size");
 }
});
test("bounded head refuses invalid budgets before allocation and propagates ordinary absence",t=>{
 const root=fixture(t);
 for(const maxBytes of [0,-1,1.5,Infinity,null,Number.MAX_SAFE_INTEGER])assert.throws(()=>readHead(root,"fact","bounded",{maxBytes}));
 assert.equal(readHead(root,"fact","bounded",{maxBytes:8192}),undefined);
});
test("bounded head refuses malformed UTF-8 and malformed JSON",t=>{
 const root=fixture(t);
 for(const bytes of [Buffer.from([0xff]),Buffer.from('{"frontier":')]){
  installHead(root,bytes);assert.throws(()=>readHead(root,"fact","bounded",{maxBytes:8192}));
 }
});
for(const kind of ["symlink","fifo","directory"])test("bounded head refuses "+kind+" without blocking",t=>{
 const root=fixture(t),file=headFile(root,"fact","bounded");fs.mkdirSync(dirname(file),{recursive:true});
 if(kind==="symlink"){const target=join(root,"target");fs.writeFileSync(target,'{"frontier":[]}');fs.symlinkSync(target,file);}
 else if(kind==="fifo")execFileSync("mkfifo",[file]);else fs.mkdirSync(file);
 assert.throws(()=>readHead(root,"fact","bounded",{maxBytes:8192}));
});
test("bounded head max+1 descriptor read catches growth after stat and preserves short reads",t=>{
 const root=fixture(t),file=installHead(root,'{"frontier":[]}');let observations=0,readBytes=0;
 observe((paths)=>({
  fstatSync:original=>fd=>{const stat=original(fd);if(paths.get(fd)===file&&++observations===2)fs.appendFileSync(file," ".repeat(8193));return stat;},
  readSync:original=>(fd,buf,offset,length,...args)=>{const count=original(fd,buf,offset,length,...args);if(paths.get(fd)===file)readBytes+=count;return count;}
 }),()=>assert.throws(()=>readHead(root,"fact","bounded",{maxBytes:8192}),e=>e.code==="head-size"));
 assert.ok(readBytes<=8193);assert.equal(readBytes,8193);
 installHead(root,'{"frontier":[]}');
 patch({readSync:original=>(fd,buf,offset,length,...args)=>original(fd,buf,offset,Math.min(length,1),...args)},
  ()=>assert.deepEqual(readHead(root,"fact","bounded",{maxBytes:8192}),{frontier:[]}));
});

