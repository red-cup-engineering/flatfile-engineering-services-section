import assert from "node:assert/strict";
import test from "node:test";
import { makeContext, has, intent, extent, closeAttrs } from "../../src/closure/formal-context.mjs";

test("FCA incidence keys separate NUL-containing object and attribute coordinates", () => {
  const ctx = makeContext(
    ["a", "a\0b"],
    ["b\0c", "c"],
    [["a\0b", "c"]],
  );
  // Previously the two distinct pairs joined to the same "a\\0b\\0c" key.
  assert.equal(has(ctx, "a\0b", "c"), true);
  assert.equal(has(ctx, "a", "b\0c"), false);
  assert.deepEqual([...intent(ctx, new Set(["a\0b"]))], ["c"]);
  assert.deepEqual([...intent(ctx, new Set(["a"]))], []);
  assert.deepEqual([...extent(ctx, new Set(["c"]))], ["a\0b"]);
  assert.deepEqual([...extent(ctx, new Set(["b\0c"]))], []);
});

test("FCA double-prime closure retains exact incidence rather than aliased attributes", () => {
  const ctx = makeContext(
    ["a", "a\0b", "z"],
    ["b\0c", "c"],
    [["a\0b", "c"], ["z", "b\0c"]],
  );
  assert.deepEqual([...closeAttrs(ctx, new Set(["c"]))], ["c"]);
  assert.deepEqual([...closeAttrs(ctx, new Set(["b\0c"]))], ["b\0c"]);
  assert.deepEqual([...closeAttrs(ctx, new Set(["c", "b\0c"]))], ["b\0c", "c"]);
});

test("denial incidence also separates ordered coordinates", () => {
  const ctx = makeContext(
    ["a", "a\0b"],
    ["b\0c", "c"],
    [],
    [["a\0b", "c"]],
  );
  assert.equal(has(ctx, "a\0b", "¬c"), true);
  assert.equal(has(ctx, "a", "¬b\0c"), false);
  assert.deepEqual([...extent(ctx, new Set(["¬c"]))], ["a\0b"]);
  assert.deepEqual([...extent(ctx, new Set(["¬b\0c"]))], []);
});

test("FCA incidence pairs preserve separators and Unicode literally", () => {
  const ctx = makeContext(
    ["a/b", "a~b", "café", "cafe\u0301"],
    ["x/y", "x~y", "🚀"],
    [["a/b", "x/y"], ["a~b", "x~y"], ["café", "🚀"]],
  );
  assert.equal(has(ctx, "a/b", "x/y"), true);
  assert.equal(has(ctx, "a/b", "x~y"), false);
  assert.equal(has(ctx, "café", "🚀"), true);
  assert.equal(has(ctx, "cafe\u0301", "🚀"), false);
});
