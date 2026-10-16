import test from "node:test";
import assert from "node:assert/strict";
import { observedDiamondIntervals, sessionTurnDiamonds } from "../src/models/order/run-causal-set.mjs";

const point = (at, hookEventName) => ({at,hookEventName});
test("reopening a causal interval cannot borrow a later close", () => {
  const a=point("a","open"), b=point("b","open"), c=point("c","close");
  assert.deepEqual(observedDiamondIntervals([a,b,c],x=>x.hookEventName,"open","close"),
    [{index:0,lower:b,upper:c,deshrouded:false}]);
  const turns=sessionTurnDiamonds("session",[a,b,c],{opensTurn:"open",closesTurn:"close"});
  assert.deepEqual(turns.map(x=>[x.lower.at,x.upper.at]),[["b","c"]]);
});
test("a deshrouded interval ends at actual progress before reopening", () => {
  const a=point("a","open"), p=point("p","progress"), b=point("b","open"), c=point("c","close");
  const intervals=observedDiamondIntervals([a,p,b,c],x=>x.hookEventName,"open","close");
  assert.deepEqual(intervals.map(x=>[x.lower.at,x.upper.at,x.deshrouded]),
    [["a","p",true],["b","c",false]]);
  assert.deepEqual(observedDiamondIntervals([a],x=>x.hookEventName,"open","close"),[]);
  assert.throws(()=>observedDiamondIntervals([],x=>x.hookEventName,"open","open"),/distinct opening/);
});
test("many fresh starts without progress create no false causal work",()=>{
  const rows=Array.from({length:24000},(_,i)=>point(String(i),"open"));
  const last=point("finished","close");
  const out=observedDiamondIntervals([...rows,last],x=>x.hookEventName,"open","close");
  assert.equal(out.length,1);
  assert.strictEqual(out[0].lower,rows.at(-1));
});
