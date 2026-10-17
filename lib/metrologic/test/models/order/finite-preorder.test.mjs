import test from "node:test";
import assert from "node:assert/strict";
import {
  finitePreorder, relates, topDownset, bottomDownset, admitDownset,
  principalDownset, meetDownsets, joinDownsets, impliesDownsets,
  negateDownset, downsetWithin,
} from "../../../src/models/order/finite-preorder.mjs";

const model = () => finitePreorder(5, [[0, 2], [1, 2], [2, 3], [4, 3]]);
const opens = (frame) => {
  const items = [];
  for (let mask = 0; mask < 2 ** frame.size; mask++) {
    const subset = topDownset(frame).filter((index) => (mask & (1 << index)) !== 0);
    try { items.push(admitDownset(frame, subset)); } catch {}
  }
  return items;
};

test("the finite presentation closes admitted arrows, not arbitrary Marks", () => {
  const f = model();
  assert.equal(relates(f, 0, 3), true);
  assert.equal(relates(f, 3, 0), false);
  assert.deepEqual(principalDownset(f, 3), [0, 1, 2, 3, 4]);
  assert.deepEqual(topDownset(f), [0, 1, 2, 3, 4]);
  assert.deepEqual(bottomDownset(), []);
  const equal = finitePreorder(3, [[0, 1], [1, 0]]);
  assert.deepEqual(equal.identified, [[0, 1]]);
  assert.deepEqual(principalDownset(equal, 0), principalDownset(equal, 1));
  assert.deepEqual(topDownset(finitePreorder(0)), []);
});

test("all downsets of a finite preorder satisfy Heyting adjunction and distributivity", () => {
  const f = model(), all = opens(f);
  const eq = (a, b) => downsetWithin(f, a, b) && downsetWithin(f, b, a);
  for (const u of all) {
    assert.ok(eq(meetDownsets(f, u, topDownset(f)), u));
    assert.ok(eq(joinDownsets(f, u, bottomDownset()), u));
    for (const v of all) {
      const right = impliesDownsets(f, u, v);
      assert.ok(all.some((open) => eq(open, right)));
      for (const w of all) {
        assert.equal(downsetWithin(f, meetDownsets(f, w, u), v), downsetWithin(f, w, right));
        assert.ok(eq(meetDownsets(f, u, joinDownsets(f, v, w)),
          joinDownsets(f, meetDownsets(f, u, v), meetDownsets(f, u, w))));
      }
    }
    assert.ok(eq(negateDownset(f, u), impliesDownsets(f, u, bottomDownset())));
  }
});

test("alien indices, falsely open subsets, mutable-lookalikes and malformed arrows refuse", () => {
  const frame = model();
  assert.throws(() => finitePreorder(2, [[0, 3]]), /outside/);
  assert.throws(() => finitePreorder(-1), /nonnegative/);
  assert.throws(() => admitDownset(frame, [3]), /every specialization/);
  assert.throws(() => relates(frame, 0, 5), /outside/);
  assert.throws(() => relates({ size: 2, up: [[], []] }, 0, 0), /admit a frame/);
  assert.equal(Object.isFrozen(frame), true);
  assert.equal(Object.isFrozen(frame.up[0]), true);
});
