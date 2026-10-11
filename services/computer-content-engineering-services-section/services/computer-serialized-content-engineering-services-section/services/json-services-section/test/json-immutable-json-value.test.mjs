import assert from "node:assert/strict";
import test from "node:test";
import { freezeJson, copyJson } from "../scripts/freeze-json.mjs";

test("makes every composite carrier in a JSON value immutable", () => {
  const value = { object: { answer: 42 }, array: [true, { nested: null }] };
  assert.equal(freezeJson(value), value);
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.object));
  assert.ok(Object.isFrozen(value.array));
  assert.ok(Object.isFrozen(value.array[1]));
});

test("refuses values outside the JSON universe", () => {
  assert.throws(() => freezeJson({ missing: undefined }), /not a JSON value/u);
});

test("preserves admitted negative zero for RFC 8785 serialization", () => {
  const value = freezeJson({ value: -0 });
  assert.ok(Object.is(value.value, -0));
});

test("already frozen parents still freeze shared mutable descendants", () => {
  const child = { values: [1, 2] };
  const value = Object.freeze({ left: child, right: child });
  const result = freezeJson(value);
  assert.equal(result, value);
  assert.equal(result.left, result.right);
  assert.equal(Object.isFrozen(child), true);
  assert.equal(Object.isFrozen(child.values), true);
});


test("copies and freezes a long SEN pair spine without host recursion", () => {
  let value = ["nil"];
  for (let i=0; i<10000; i++) value = ["pair", i, value];
  const copy = freezeJson(copyJson(value));
  assert.notEqual(copy, value);
  let source=value, held=copy, count=0;
  while (held[0] === "pair") {
    assert.notEqual(held, source);assert.equal(held[1], source[1]);assert.ok(Object.isFrozen(held));
    held=held[2];source=source[2];count++;
  }
  assert.equal(count,10000);assert.deepEqual(held,["nil"]);
});

test("JSON copies preserve aliases, negative zero and __proto__ without prototype effects", () => {
  const shared={value:-0};const value={left:shared,right:shared};
  Object.defineProperty(value,"__proto__",{value:{owned:true},enumerable:true});
  const copy=copyJson(value);
  assert.notEqual(copy.left, shared);assert.equal(copy.left, copy.right);
  assert.ok(Object.is(copy.left.value,-0));assert.equal(Object.getPrototypeOf(copy),Object.prototype);
  assert.ok(Object.hasOwn(copy,"__proto__"));assert.equal(copy.__proto__.owned,true);
  copy.left.value=42;assert.ok(Object.is(shared.value,-0));
  const cyclic={};cyclic.self=cyclic;assert.throws(()=>copyJson(cyclic),/not a JSON value/u);
  assert.throws(()=>copyJson({invalid:undefined}),/not a JSON value/u);
});
