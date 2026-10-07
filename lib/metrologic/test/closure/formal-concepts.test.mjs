import assert from "node:assert/strict";
import test from "node:test";
import { CONCEPT_CEILING, enumerateFormalConcepts } from "../../src/closure/formal-concepts.mjs";

test("bounded FCA falls back deterministically before closure growth becomes unbounded", () => {
  const attributes = Array.from({ length: 11 }, (_, index) => `attribute:${index}`);
  const objects = attributes.map((omitted, index) => ({ id: `room:${index}`, attrs: new Set(attributes.filter((attribute) => attribute !== omitted)) }));
  const result = enumerateFormalConcepts(objects, (id) => id);
  assert.equal(result.fellBackToGreedy, true);
  assert.equal(result.fallbackReason, "concept-ceiling");
  assert.equal(CONCEPT_CEILING, 1024);
  assert.ok(result.concepts.length > 0, "the approximation returns deterministic single-attribute groups");
  assert.ok(result.concepts.every((concept) => concept.intent.length === 1));
});

test("FCA distinguishes attribute and extent sets whose concatenated names would collide", () => {
  const result = enumerateFormalConcepts([
    { id: "first", attrs: new Set(["ab", "c"]) },
    { id: "second", attrs: new Set(["a", "bc"]) },
    { id: "third", attrs: new Set(["ab", "c"]) },
  ], (id) => id);
  assert.equal(result.fellBackToGreedy, false);
  assert.ok(result.concepts.some(({ intent, extent }) => intent.join(",") === "ab,c" && extent.join(",") === "first,third"));
});

test("FCA distinguishes extents whose concatenated room ids would collide", () => {
  const result = enumerateFormalConcepts([
    { id: "ab", attrs: new Set(["left"]) }, { id: "c", attrs: new Set(["left"]) },
    { id: "a", attrs: new Set(["right"]) }, { id: "bc", attrs: new Set(["right"]) },
  ], (id) => id);
  assert.ok(result.concepts.some(({ intent, extent }) => intent.join(",") === "left" && extent.join(",") === "ab,c"));
  assert.ok(result.concepts.some(({ intent, extent }) => intent.join(",") === "right" && extent.join(",") === "a,bc"));
});

test("bounded FCA falls back before an oversized initial intent family reaches pairwise closure", () => {
  const objects = Array.from({ length: CONCEPT_CEILING + 2 }, (_, index) => ({
    id: `room:${index}`,
    attrs: new Set(Array.from({ length: 11 }, (_, bit) => ((index >> bit) & 1) === 1 ? `attribute:${bit}` : null).filter(Boolean)),
  }));
  const result = enumerateFormalConcepts(objects, (id) => id);
  assert.equal(result.fellBackToGreedy, true);
  assert.equal(result.fallbackReason, "concept-ceiling");
});


function obj(id, attrs) {
  return { id, attrs: new Set(attrs) };
}

test('produces the non-partition lattice from DESIGN.md §1\'s worked example shape: two attributes cross a shared object', () => {
  // atari/handicap co-occur on "BH"; handicap/komi co-occur on "BW" — handicap sits in two
  // halls, a genuine lattice, not a partition.
  const objects = [
    obj('atari', ['cites:BH']),
    obj('handicap', ['cites:BH', 'cites:BW']),
    obj('komi', ['cites:BW']),
    obj('eye', ['cites:BH']),
  ];
  const { concepts } = enumerateFormalConcepts(objects, (id) => id);
  const bh = concepts.find((c) => c.intent.includes('cites:BH') && !c.intent.includes('cites:BW'));
  const bw = concepts.find((c) => c.intent.includes('cites:BW') && !c.intent.includes('cites:BH'));
  assert.ok(bh);
  assert.ok(bw);
  assert.deepEqual(bh.extent.sort(), ['atari', 'eye', 'handicap']);
  assert.deepEqual(bw.extent.sort(), ['handicap', 'komi']);
  // handicap belongs to both -- the lattice, not-a-partition property.
  assert.ok(bh.extent.includes('handicap') && bw.extent.includes('handicap'));
});

test('intent is the exact closure, not a superset match: an object with extra attributes still forms the concept', () => {
  const objects = [
    obj('a', ['x', 'y']),
    obj('b', ['x', 'y', 'z']), // b carries x,y plus an extra attribute z
  ];
  const { concepts } = enumerateFormalConcepts(objects, (id) => id);
  const c = concepts.find((c) => c.extent.length === 2);
  assert.ok(c);
  // intent must be exactly {x,y} (the common attributes), not {x,y,z}.
  assert.deepEqual(c.intent.sort(), ['x', 'y']);
});

test('a concept needs |extent| >= 2 -- a uniquely-attributed object forms no hall', () => {
  const objects = [obj('a', ['only-a']), obj('b', ['shared']), obj('c', ['shared'])];
  const { concepts } = enumerateFormalConcepts(objects, (id) => id);
  assert.equal(concepts.some((c) => c.extent.includes('a')), false);
  assert.ok(concepts.some((c) => c.extent.sort().join() === 'b,c'));
});

test('objects sharing no attributes at all produce no concepts', () => {
  const objects = [obj('a', ['p']), obj('b', ['q'])];
  const { concepts } = enumerateFormalConcepts(objects, (id) => id);
  assert.deepEqual(concepts, []);
});

test('is deterministic and order-independent in the object list', () => {
  const objects = [obj('a', ['x']), obj('b', ['x']), obj('c', ['x', 'y']), obj('d', ['y'])];
  const shuffled = [objects[2], objects[0], objects[3], objects[1]];
  const r1 = enumerateFormalConcepts(objects, (id) => id).concepts;
  const r2 = enumerateFormalConcepts(shuffled, (id) => id).concepts;
  const norm = (cs) => cs.map((c) => `${c.intent.slice().sort().join(',')}|${c.extent.slice().sort().join(',')}`).sort();
  assert.deepEqual(norm(r1), norm(r2));
});
