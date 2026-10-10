import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { applyJsonPatch, checkJsonPatch, createJsonPatch } from "../scripts/json-patch.mjs";
import { parseJsonPointer, resolveJsonPointer } from "../scripts/resolve-json-pointer.mjs";
import { selectJsonPointer } from "../scripts/json-transformations.mjs";

test("all 108 enabled independent JSON Patch cases retain their expected receiving", () => {
  let count = 0;
  for (const name of ["tests.json", "spec_tests.json"]) {
    const cases = JSON.parse(fs.readFileSync(new URL(`fixtures/json-patch/${name}`, import.meta.url)));
    for (const [i, fixture] of cases.entries()) {
      if (fixture.disabled) continue;
      const input = { value: fixture.doc, patch: fixture.patch }; const unchanged = structuredClone(input);
      const label = `${name}:${i} ${fixture.comment ?? ""}`;
      if (Object.hasOwn(fixture, "error")) {
        assert.throws(() => applyJsonPatch(input), undefined, label);
        assert.equal(checkJsonPatch(input).applicable, false, label);
      } else {
        assert.deepEqual(applyJsonPatch(input), { present: true, value: fixture.expected }, label);
        assert.equal(checkJsonPatch(input).applicable, true, label);
      }
      assert.deepEqual(input, unchanged, label); count++;
    }
  }
  assert.equal(count, 108);
});
test("removing a document is distinct from null and a later root add restores it", () => {
  assert.deepEqual(applyJsonPatch({ value: null, patch: [] }), { present: true, value: null });
  assert.deepEqual(applyJsonPatch({ value: { a: 1 }, patch: [{ op: "remove", path: "" }] }), { present: false });
  assert.deepEqual(applyJsonPatch({ value: null, patch: [{ op: "remove", path: "" }, { op: "add", path: "", value: 0 }] }), { present: true, value: 0 });
  assert.equal(checkJsonPatch({ value: null, patch: [{ op: "remove", path: "" }, { op: "test", path: "", value: null }] }).error.operation, 1);
  assert.deepEqual(applyJsonPatch({ value: 3, patch: [{ op: "move", path: "", from: "" }] }), { present: true, value: 3 });
});
test("escaped and prototype-looking keys remain data; copies never alias", () => {
  const value = JSON.parse('{"__proto__":{"x":1},"constructor":{"prototype":{"x":2}},"a/b":{"~":3}}');
  const result = applyJsonPatch({ value, patch: [
    { op: "copy", from: "/__proto__", path: "/copy" }, { op: "replace", path: "/copy/x", value: 9 },
    { op: "replace", path: "/constructor/prototype/x", value: 4 }, { op: "test", path: "/a~1b/~0", value: 3 },
  ] });
  assert.equal(result.value.__proto__.x, 1); assert.equal(result.value.copy.x, 9);
  assert.equal(Object.getPrototypeOf(result.value), Object.prototype); assert.equal({}.x, undefined);
  assert.equal(value.constructor.prototype.x, 2);
  assert.equal(checkJsonPatch({ value: {}, patch: [{ op: "add", path: "/__proto__/polluted", value: true }] }).applicable, false);
});
test("patch string pointers share parsing while schema/lookup fragments retain receiving", () => {
  const value = { "a/b": { "~1": null }, "": 7, "a b": 4 };
  assert.deepEqual(parseJsonPointer("/a~1b/~01"), ["a/b", "~1"]);
  assert.equal(resolveJsonPointer(value, "#/a~1b/~01"), null);
  assert.deepEqual(selectJsonPointer({ value, pointer: "#/a%20b" }), { found: true, value: 4 });
  assert.deepEqual(selectJsonPointer({ value, pointer: "/missing" }), { found: false });
  assert.equal(checkJsonPatch({ value, patch: [{ op: "test", path: "#/a~1b/~01", value: null }] }).error.code, "invalid-pointer");
  assert.equal(checkJsonPatch({ value, patch: [{ op: "move", from: "/a~1b", path: "/a~1b/~01" }] }).error.code, "move-into-descendant");
});
test("generated standard patches independently receive the target on finite tree pairs", () => {
  const values = [null, false, 0, -0, 1, "1", "é", {}, [], [1], [1, 2], [2, 1],
    { "a.b": 1, "a/b": 2 }, { "a.b": null, "a/b": [3, 4] }, JSON.parse('{"__proto__":1}'),
    { a: { b: 1 }, empty: [] }, { a: { b: 2 }, empty: [null] }];
  let count = 0;
  for (const before of values) for (const after of values) {
    const patch = createJsonPatch({ before, after });
    assert.deepEqual(applyJsonPatch({ value: before, patch }), { present: true, value: JSON.parse(JSON.stringify(after)) });
    count++;
  }
  assert.equal(count, 289);
  assert.deepEqual(createJsonPatch({ before: { "a/b": 1 }, after: { "a/b": 2 } }), [{ op: "replace", path: "/a~1b", value: 2 }]);
});
test("failed sequences are atomic to callers and resource excess is refused", () => {
  const input = { value: { n: 1 }, patch: [{ op: "replace", path: "/n", value: 2 }, { op: "test", path: "/n", value: 1 }] };
  assert.throws(() => applyJsonPatch(input), /equal/); assert.equal(input.value.n, 1);
  assert.deepEqual(checkJsonPatch(input), { applicable: false, error: { code: "test-failed", message: "target does not equal the test value", operation: 1 } });
  assert.throws(() => applyJsonPatch({ value: null, patch: Array.from({length:129}, () => ({op:"test",path:"",value:null})) }), /128/);
  assert.throws(() => applyJsonPatch({ value: { text: "a".repeat(40000) }, patch: [{ op: "copy", from: "/text", path: "/copy" }] }), /canonical-limit/);
  let spine = null; for(let i=0;i<70;i++) spine = ["pair", 1, spine];
  assert.throws(() => applyJsonPatch({ value: spine, patch: [] }), /depth 64/);
  let reads=0; const bad={get x(){reads++;return 1;}};
  assert.throws(() => applyJsonPatch({ value: bad, patch: [] })); assert.equal(reads,0);
});
