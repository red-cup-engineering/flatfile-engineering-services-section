import test from "node:test";
import assert from "node:assert/strict";
import { MarkSchema, mark, isMark } from "../src/mark.mjs";

test("a mathematical Mark can carry any source-admitted schema without NI identity",()=>{
  const payload={ schema:{type:"object",properties:{anything:{}}}, datum:[1,{a:true}] };
  const m=mark(payload);
  assert.equal(m.kind,"utterance.mark");
  assert.equal(m.value,payload);
  assert.equal(isMark(m),true);
  assert.equal(isMark({kind:"utterance.mark",value:null}),true);
  assert.equal(isMark({kind:"utterance.mark",value:0,unexpected:"side channel"}),false);
  assert.equal(MarkSchema.properties.value.constructor,Object);
  assert.equal(Object.isFrozen(m),true);
  assert.equal("ni" in m,false);
  assert.equal("id" in m,false);
});

test("presentation coincidence alone cannot be promoted to a Mark equality theorem",()=>{
  const first=mark({n:1}), second=mark({n:1});
  assert.notEqual(first,second);
  assert.deepEqual(first.value,second.value);
  assert.equal(typeof first.equals,"undefined");
  assert.equal(typeof first.coincides,"undefined");
});
