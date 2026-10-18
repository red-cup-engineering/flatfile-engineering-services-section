import assert from "node:assert/strict";
import test from "node:test";
import {
  makeContext, withSignedAttributes, has, intent, extent, closeAttrs,
  dgBasis, lawfulBasis, impClosure,
} from "../../src/closure/formal-context.mjs";

const sorted = values => [...values].sort();
const implicationFamily = basis => basis.map(imp =>
  JSON.stringify([sorted(imp.from), sorted(imp.to)])).sort();

test("explicit signed attributes declare coordinates without fabricating incidence", () => {
  const source = makeContext(["present", "quiet"], ["x", "y"], [["present", "x"]]);
  const before = structuredClone(source);
  Object.freeze(source);
  Object.freeze(source.G);
  Object.freeze(source.M);
  Object.freeze(source.A);
  const signed = withSignedAttributes(source);
  assert.deepEqual(source, before);
  assert.deepEqual(source.A, ["x", "y"], "positive-only construction retains its original alphabet");
  assert.deepEqual(signed.A, ["x", "y", "¬x", "¬y"]);
  assert.deepEqual([...signed.attrIndex], [["x", 0], ["y", 1], ["¬x", 2], ["¬y", 3]]);
  assert.deepEqual(signed.G, source.G);
  assert.deepEqual(signed.M, source.M);
  assert.deepEqual(signed.I, source.I);
  assert.equal(has(signed, "present", "x"), true);
  for (const object of source.G) for (const attribute of ["¬x", "¬y"])
    assert.equal(has(signed, object, attribute), false);
  assert.deepEqual([...extent(signed, ["¬x"])], []);
  assert.deepEqual(sorted(closeAttrs(signed, ["x"])), sorted(closeAttrs(source, ["x"])));
  assert.throws(() => extent(source, ["¬x"]), /outside the declared context carrier/);
  for (const attribute of ["ghost", "¬ghost"]) {
    assert.throws(() => extent(signed, [attribute]), /outside the declared context carrier/);
    assert.throws(() => closeAttrs(signed, [attribute]), /outside the declared context carrier/);
  }
  // Empty valid extents retain their full Galois intent. Supported compilation
  // is separate; declaring a negative coordinate does not change this law.
  assert.deepEqual([...intent(signed, [])], signed.A);
  assert.deepEqual([...closeAttrs(signed, ["¬x"])], signed.A);
  assert.deepEqual(source, before);
});

test("signed extension is idempotent and preserves witnessed denials", () => {
  const source = makeContext(["affirmed", "denied"], ["x", "y"],
    [["affirmed", "x"]], [["denied", "x"]]);
  const before = structuredClone(source);
  const signed = withSignedAttributes(source);
  assert.deepEqual(withSignedAttributes(signed), signed);
  assert.deepEqual(signed, before);
  assert.deepEqual([...extent(signed, ["¬x"])], ["denied"]);
  assert.equal(has(signed, "affirmed", "¬x"), false);
  assert.equal(has(signed, "denied", "x"), false);
  assert.deepEqual(source, before);
});

test("observed-column compilation preserves the full supported DG family on every small signed context and seed", () => {
  const objects = ["g0", "g1"], attributes = ["a", "b"];
  const slots = objects.flatMap(object => attributes.flatMap(attribute => [
    { object, attribute, denied: false }, { object, attribute, denied: true },
  ]));
  let contexts = 0, seeds = 0, contradictorySeeds = 0, unrealizedSeeds = 0;
  for (let mask = 0; mask < 2 ** slots.length; mask++) {
    const present = slots.filter((_, index) => (mask & (1 << index)) !== 0);
    const rows = denied => present.filter(slot => slot.denied === denied)
      .map(slot => [slot.object, slot.attribute]);
    const ctx = withSignedAttributes(makeContext(objects, attributes, rows(false), rows(true)));
    const before = structuredClone(ctx);
    // This is the unchanged full canonical path, before the new private
    // observed-column projection. It retains all declared signed coordinates.
    const fullSupported = dgBasis(ctx).filter(imp => extent(ctx, imp.from).size > 0);
    const compiled = lawfulBasis(ctx);
    assert.deepEqual(implicationFamily(compiled), implicationFamily(fullSupported), "context " + mask);
    for (let choice = 0; choice < 2 ** ctx.A.length; choice++) {
      const seed = new Set(ctx.A.filter((_, index) => (choice & (1 << index)) !== 0));
      assert.deepEqual(sorted(impClosure(compiled, seed)),
        sorted(impClosure(fullSupported, seed)), "context " + mask + ", seed " + choice);
      if (attributes.some(attribute => seed.has(attribute) && seed.has("¬" + attribute))) contradictorySeeds++;
      if (extent(ctx, seed).size === 0) unrealizedSeeds++;
      seeds++;
    }
    assert.deepEqual(ctx, before);
    contexts++;
  }
  assert.equal(contexts, 256);
  assert.equal(seeds, 4096);
  assert.equal(contradictorySeeds, 1792);
  assert.ok(unrealizedSeeds > 0);
});

test("unobserved signed columns do not consume the supported basis enumeration budget", () => {
  const attributes = Array.from({ length: 32 }, (_, index) => "m" + index);
  const ctx = withSignedAttributes(makeContext(["object"], attributes,
    [["object", "m0"], ["object", "m1"]]));
  const before = structuredClone(ctx);
  assert.equal(ctx.A.length, 64);
  assert.throws(() => dgBasis(ctx), /at most 20 attribute coordinates/);
  const basis = lawfulBasis(ctx);
  assert.deepEqual(implicationFamily(basis), [JSON.stringify([[], ["m0", "m1"]])]);
  const seed = new Set(["¬m0", "m31", "¬m31"]);
  assert.deepEqual(sorted(impClosure(basis, seed)), sorted(["m0", "m1", "¬m0", "m31", "¬m31"]));
  assert.deepEqual([...closeAttrs(ctx, seed)], ctx.A,
    "full Galois closure retains its declared alphabet for an unrealized seed");
  assert.deepEqual(ctx, before);
});

test("more than twenty actually incident coordinates still refuse exact supported compilation", () => {
  const attributes = Array.from({ length: 11 }, (_, index) => "m" + index);
  const ctx = makeContext(["object"], attributes,
    attributes.map(attribute => ["object", attribute]),
    attributes.slice(0, 10).map(attribute => ["object", attribute]));
  assert.equal(ctx.A.length, 22);
  assert.equal(ctx.A.filter(attribute => has(ctx, "object", attribute)).length, 21);
  assert.throws(() => lawfulBasis(ctx), /at most 20 attribute coordinates/);
});

test("an empty object carrier has no supported implications even with a large signed alphabet", () => {
  const attributes = Array.from({ length: 32 }, (_, index) => "m" + index);
  const ctx = withSignedAttributes(makeContext([], attributes, []));
  assert.deepEqual(lawfulBasis(ctx), []);
  assert.deepEqual([...closeAttrs(ctx, [])], ctx.A);
  const seed = new Set(["m0", "¬m0"]);
  assert.deepEqual(impClosure(lawfulBasis(ctx), seed), seed);
  const empty = withSignedAttributes(makeContext([], [], []));
  assert.deepEqual(empty.A, []);
  assert.deepEqual(lawfulBasis(empty), []);
});
