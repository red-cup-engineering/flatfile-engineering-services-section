import assert from "node:assert/strict";
import test from "node:test";
import { address, addressNested, termOf, termOfNested, termKey } from "../lib/address.mjs";
import { sanitizeSegment, desanitizeSegment } from "../lib/segments.mjs";
import { normalizePath, pathParent } from "../lib/posix.mjs";

test("typed addresses retain existing readable coordinates and reversible encoded parts", () => {
  assert.equal(address("/store", "creatures/ada", "jsonl"), "/store/creatures/ada/ada.jsonl");
  assert.equal(address("/", "creatures/ada", "json"), "/creatures/ada/ada.json");
  assert.equal(termOf("/store", address("/store", "creatures/ada", "jsonl")), "creatures/ada");
  const parts = ["..", "one/two", "~json:reserved", "λ 🐟", ""];
  const path = addressNested("/store", parts, "json");
  assert.deepEqual(termOfNested("/store", path), parts.map(termKey));
  assert.throws(() => termOf("/store", "/store-other/ada/ada.json"));
  assert.throws(() => termOf("/store", "/store/ada/something.json"));
  assert.throws(() => address("/store", "ada", "../../escape"));
});

test("one segment codec preserves Unicode and refuses aliases that cannot round-trip", () => {
  for (const text of ["", ".", "..", ".hidden", "a/b", "~", "λ 🐟", "a\0b"])
    assert.equal(desanitizeSegment(sanitizeSegment(text)), text);
  for (const alias of [".", "..", "~73", "~FF", "~ff", "~ed~a0~80", "x/y"])
    assert.throws(() => desanitizeSegment(alias));
  assert.throws(() => sanitizeSegment("\ud800"));
  assert.equal(normalizePath("/a/../b/./c"), "/b/c");
  assert.equal(pathParent("/b/c"), "/b");
});

test("JSON prototype-shaped properties survive both address carriers without collisions", () => {
  const term = JSON.parse('{"__proto__":{"important":true},"a":1}');
  assert.notEqual(termKey(term), termKey({ a: 1 }));
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => termKey(cyclic));
});
