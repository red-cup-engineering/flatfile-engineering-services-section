import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { markdownDirectoryProvider } from "../src/adapters/markdown-directory.mjs";
import { identity } from "../src/kernel/identity.mjs";

const readBody = async (root) => {
  const provider = markdownDirectoryProvider({id:"test:paracosm-body",root});
  const observed = await provider.observe();
  const resource = observed.resources.find(x=>x.focus==="episode");
  assert.ok(resource,"text must be represented as a graph resource");
  const body = resource.cells.filter(x=>x.predicate==="urn:fars:body-content-id");
  assert.equal(body.length,1);
  return {bodyId:body[0].object,resource};
};

test("script-only changes get a new NI-identified body while the stable path keeps its resource identity",async()=>{
 const root=mkdtempSync(join(tmpdir(),"fars-body-"));
 const dir=join(root,"texts");mkdirSync(dir);
 const file=join(dir,"episode.md");
 const first="---\ntype: text\nname: Episode\ndescription: A scene.\n---\n\nThe door opens.\n";
 const second="---\ntype: text\nname: Episode\ndescription: A scene.\n---\n\nThe door refuses to open.\n";
 try{
   writeFileSync(file,first);
   const a=await readBody(root);
   assert.match(a.bodyId,/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
   const same=await readBody(root);
   assert.equal(a.bodyId,same.bodyId);
   writeFileSync(file,second);
   const b=await readBody(root);
   assert.notEqual(a.bodyId,b.bodyId);
   assert.equal(a.resource.resource,b.resource.resource,"same source resource coordinate");
   assert.deepEqual(
     a.resource.cells.filter(x=>x.predicate.startsWith("urn:fars:attribute:")).map(x=>[x.predicate,x.object]),
     b.resource.cells.filter(x=>x.predicate.startsWith("urn:fars:attribute:")).map(x=>[x.predicate,x.object]),
     "frontmatter claims are unchanged");
   assert.ok(a.bodyId!==identity({kind:"fars.markdown-body.v1",body:"completely unrelated"}));
 }finally{rmSync(root,{recursive:true,force:true});}
});
