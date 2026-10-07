import assert from "node:assert/strict";
import test from "node:test";
import { check } from "../src/closure/rules/cycles.mjs";

function dependsOn(pairs) {
  const map = new Map();
  for (const [src, dst] of pairs) {
    if (!map.has(src)) map.set(src, []);
    map.get(src).push(dst);
  }
  return map;
}

test("a self-loop is reported as its own length-1 diagnostic", () => {
  const diagnostics = check(dependsOn([["a", "a"]]), new Map([["a", [{ path: "a.md" }]]]));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, "cycles");
  assert.equal(diagnostics[0].slug, "a");
  assert.equal(diagnostics[0].path, "a.md");
  assert.match(diagnostics[0].message, /self-loop/);
});

test("a multi-node cycle is reported once, separately from an unrelated self-loop", () => {
  const diagnostics = check(
    dependsOn([["a", "a"], ["b", "c"], ["c", "d"], ["d", "b"]]),
    new Map(),
  );
  assert.equal(diagnostics.length, 2);
  const selfLoop = diagnostics.find((d) => d.slug === "a");
  assert.ok(selfLoop);
  const multiNode = diagnostics.find((d) => d.slug === null);
  assert.ok(multiNode);
  assert.match(multiNode.message, /cycle in depends-on: `[bcd]` → `[bcd]` → `[bcd]`/);
});

test("an acyclic depends-on graph reports nothing", () => {
  const diagnostics = check(dependsOn([["a", "b"], ["b", "c"]]), new Map());
  assert.deepEqual(diagnostics, []);
});
