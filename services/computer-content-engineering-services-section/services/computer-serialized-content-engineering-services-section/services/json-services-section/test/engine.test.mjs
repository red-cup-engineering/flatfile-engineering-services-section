import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson } from "../scripts/canonical-json.mjs";
import { parseJsonValue as decodeJson } from "../scripts/parse-json-value.mjs";
import { isJsonValue as isJson } from "../scripts/is-json-value.mjs";

test("admits finite acyclic JSON values only", () => {
  const cycle = {};
  cycle.self = cycle;
  assert.equal(isJson({ a: [true, null, 1] }), true);
  assert.equal(isJson(cycle), false);
  assert.equal(isJson([, 1]), false);
  assert.equal(isJson(Infinity), false);
});

test("canonical JSON sorts object keys recursively", () => {
  assert.equal(
    canonicalJson({ z: { b: 2, a: 1 }, a: 0 }),
    '{"a":0,"z":{"a":1,"b":2}}',
  );
  assert.deepEqual(decodeJson('{"a":[1,true]}'), { a: [1, true] });
});

test("canonical encoding preserves own prototype-named keys and numeric key order", () => {
  const value = JSON.parse(
    '{"__proto__":{"safe":true},"2":"second","10":"tenth"}',
  );
  assert.equal(
    canonicalJson(value),
    '{"10":"tenth","2":"second","__proto__":{"safe":true}}',
  );
});
