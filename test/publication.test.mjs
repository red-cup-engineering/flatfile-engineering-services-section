import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { createFlatfile, writeFlatfile } from "../src/flatfile.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), "flatfile-publication-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, path: join(root, "value.json") };
}

function fault(t, method, replacement) {
  mock.method(fs, method, replacement);
  syncBuiltinESMExports();
  t.after(() => { mock.restoreAll(); syncBuiltinESMExports(); });
}

test("immutable retries retain exact bytes, inode and private mode; conflicts preserve the winner", (t) => {
  const {root, path} = fixture(t), text = '{"value":"日本語"}\n';
  assert.equal(writeFlatfile(path, text, {ifExists: "same", mode: 0o600}), path);
  const before = fs.statSync(path);
  assert.equal(writeFlatfile(path, text, {ifExists: "same", mode: 0o600}), path);
  assert.equal(fs.statSync(path).ino, before.ino);
  assert.equal(fs.statSync(path).mode & 0o777, 0o600 & ~process.umask());
  assert.throws(() => writeFlatfile(path, "other\n", {ifExists: "same", conflictMessage: "projection conflicts"}), {name: "TypeError", message: "projection conflicts"});
  assert.equal(fs.readFileSync(path, "utf8"), text);
  assert.equal(fs.statSync(path).ino, before.ino);
  assert.deepEqual(fs.readdirSync(root), ["value.json"]);
});

test("create-only returns boolean without replacing an existing file", (t) => {
  const {path} = fixture(t);
  assert.equal(createFlatfile(path, "first"), true);
  assert.equal(createFlatfile(path, "second"), false);
  assert.equal(fs.readFileSync(path, "utf8"), "first");
});

test("a partial temporary write failure cleans the scratch file and leaves target absent", (t) => {
  const {root, path} = fixture(t), original = fs.writeFileSync;
  fault(t, "writeFileSync", (fd) => { original(fd, "partial"); throw Object.assign(new Error("disk full"), {code: "ENOSPC"}); });
  assert.throws(() => createFlatfile(path, "complete"), {code: "ENOSPC"});
  assert.deepEqual(fs.readdirSync(root), []);
});

test("a file fsync failure cleans the scratch file without publishing", (t) => {
  const {root, path} = fixture(t), original = fs.fsyncSync;
  fault(t, "fsyncSync", (fd) => { if (fs.fstatSync(fd).isFile()) throw Object.assign(new Error("sync failed"), {code:"EIO"}); original(fd); });
  assert.throws(() => createFlatfile(path, "complete"), {code:"EIO"});
  assert.deepEqual(fs.readdirSync(root), []);
});

test("publication failure cleans scratch and preserves existing destination", (t) => {
  const {root, path} = fixture(t);
  fs.writeFileSync(path, "winner");
  fault(t, "linkSync", () => { throw Object.assign(new Error("link denied"), {code:"EPERM"}); });
  assert.throws(() => createFlatfile(path, "other"), {code:"EPERM"});
  assert.equal(fs.readFileSync(path, "utf8"), "winner");
  assert.deepEqual(fs.readdirSync(root), ["value.json"]);
});

test("directory sync failure after publication keeps target; identical retry syncs before success", (t) => {
  const {root, path} = fixture(t), original = fs.fsyncSync;
  let fail = true, directorySyncs = 0;
  fault(t, "fsyncSync", (fd) => {
    if (fs.fstatSync(fd).isDirectory()) {
      directorySyncs++;
      if (fail) throw Object.assign(new Error("directory sync failed"), {code:"EIO"});
    }
    original(fd);
  });
  assert.throws(() => writeFlatfile(path, "winner", {ifExists:"same", createDirectories:false}), {code:"EIO"});
  assert.equal(fs.readFileSync(path, "utf8"), "winner");
  assert.deepEqual(fs.readdirSync(root), ["value.json"]);
  const inode = fs.statSync(path).ino;
  fail = false;
  assert.equal(writeFlatfile(path, "winner", {ifExists:"same", createDirectories:false}), path);
  assert.equal(fs.statSync(path).ino, inode);
  assert.equal(directorySyncs, 2);
});

test("cleanup failure after publication propagates without removing target", (t) => {
  const {path} = fixture(t);
  fault(t, "unlinkSync", () => { throw Object.assign(new Error("unlink failed"), {code:"EIO"}); });
  assert.throws(() => createFlatfile(path, "winner", {createDirectories:false}), {code:"EIO"});
  assert.equal(fs.readFileSync(path, "utf8"), "winner");
});

for (const same of [false, true]) test("concurrent immutable publishers " + (same ? "agree on identical bytes" : "cannot replace a competing winner"), async (t) => {
  const {root, path} = fixture(t), gate = new SharedArrayBuffer(4), count = 8;
  const moduleUrl = new URL("../src/flatfile.mjs", import.meta.url).href;
  const workers = Array.from({length:count}, (_, i) => new Worker(
    "const {parentPort,workerData}=require('node:worker_threads');" +
    "import(workerData.moduleUrl).then(({writeFlatfile})=>{" +
    "parentPort.postMessage('ready');Atomics.wait(new Int32Array(workerData.gate),0,0);" +
    "try{writeFlatfile(workerData.path,workerData.text,{ifExists:'same',mode:384,createDirectories:false});parentPort.postMessage({ok:true,text:workerData.text});}" +
    "catch(e){parentPort.postMessage({ok:false,name:e.name,message:e.message});}});",
    {eval:true,workerData:{moduleUrl,path,gate,text:same?"same\n":i+"\n"}}
  ));
  t.after(() => Promise.all(workers.map(w => w.terminate())));
  const results = workers.map(w => new Promise((accept, reject) => {
    w.on("error",reject); w.on("message",m=>{if(m!=="ready")accept(m);});
  }));
  await Promise.all(workers.map(w=>new Promise((accept,reject)=>{w.once("message",accept);w.once("error",reject);})));
  Atomics.store(new Int32Array(gate),0,1);Atomics.notify(new Int32Array(gate),0);
  const values=await Promise.all(results),wins=values.filter(v=>v.ok);
  assert.equal(wins.length,same?count:1);
  assert.equal(fs.readFileSync(path,"utf8"),wins[0].text);
  for(const loss of values.filter(v=>!v.ok))assert.equal(loss.name,"TypeError");
  assert.deepEqual(fs.readdirSync(root),["value.json"]);
});
