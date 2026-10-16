import assert from "node:assert/strict";
import test from "node:test";
import { makeContext, has, intent, extent, closeAttrs, dgBasis, lawfulBasis, impClosure } from "../../src/closure/formal-context.mjs";

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


test("FCA signed alphabet refuses literal-negation name collisions", () => {
  // Without this guard positive incidence for the literal name ¬x and
  // negative incidence for x both keyed as the same attribute ¬x.
  assert.throws(() => makeContext(
    ["affirmed", "denied"], ["x", "¬x"],
    [["affirmed", "¬x"]], [["denied", "x"]],
  ), /reserved negation prefix/);
  assert.throws(() => makeContext(["o"], ["¬x"], [["o", "¬x"]]),
    /reserved negation prefix/);
  const ordinary = makeContext(["affirmed", "denied"], ["x"],
    [["affirmed", "x"]], [["denied", "x"]]);
  assert.deepEqual(ordinary.A, ["x", "¬x"]);
  assert.equal(has(ordinary, "affirmed", "x"), true);
  assert.equal(has(ordinary, "affirmed", "¬x"), false);
  assert.equal(has(ordinary, "denied", "¬x"), true);
  assert.equal(has(ordinary, "denied", "x"), false);
});

test("a formal context admits only distinct, in-universe incidence coordinates", () => {
  assert.throws(() => makeContext(["o", "o"], ["x"], []), /distinct/);
  assert.throws(() => makeContext(["o"], ["x", "x"], []), /distinct/);
  assert.throws(() => makeContext([4], ["x"], []), /strings/);
  assert.throws(() => makeContext(["o"], [4], []), /strings/);
  assert.throws(() => makeContext(["o"], ["x"], [["other", "x"]]), /outside the context/);
  assert.throws(() => makeContext(["o"], ["x"], [["o", "other"]]), /outside the context/);
  assert.throws(() => makeContext(["o"], ["x"], [], [["o", "other"]]), /outside the context/);
  assert.throws(() => makeContext(["o"], ["x"], null), /must be arrays/);
  // Empty labels are valid names; tuple encoding keeps them unambiguous.
  const ctx = makeContext([""], [""], [["", ""]]);
  assert.equal(has(ctx, "", ""), true);
  assert.deepEqual([...closeAttrs(ctx, new Set())], [""]);
});

test("canonical FCA bases refuse unsupported size instead of silently truncating", () => {
  const tooMany = Array.from({length: 21}, (_, index) => "m" + index);
  const ctx = makeContext(["object"], tooMany, tooMany.map(m => ["object", m]));
  assert.throws(() => dgBasis(ctx), /at most 20/);
  assert.throws(() => lawfulBasis(ctx), /at most 20/);
  const ten = Array.from({length: 11}, (_, index) => "m" + index);
  const signed = makeContext(["object"], ten, [], [["object", ten[0]]]);
  assert.equal(signed.A.length, 22);
  assert.throws(() => dgBasis(signed), /at most 20/);
  assert.deepEqual(dgBasis(makeContext([], [], [])), []);
});

test("small exact canonical FCA bases reproduce Galois double-prime closure", () => {
  const objects = ["g0", "g1", "g2"], attributes = ["a", "b", "c"];
  const slots = objects.flatMap(g => attributes.map(m => [g, m]));
  let examples = 0;
  for (let mask = 0; mask < 2 ** slots.length; mask++) {
    const ctx = makeContext(objects, attributes,
      slots.filter((_, index) => (mask & (1 << index)) !== 0));
    const basis = dgBasis(ctx);
    for (let selection = 0; selection < 2 ** attributes.length; selection++) {
      const seed = new Set(attributes.filter((_, index) =>
        (selection & (1 << index)) !== 0));
      assert.deepEqual([...impClosure(basis, seed)].sort(), [...closeAttrs(ctx, seed)].sort());
      examples++;
    }
  }
  assert.equal(examples, 4096);
});
