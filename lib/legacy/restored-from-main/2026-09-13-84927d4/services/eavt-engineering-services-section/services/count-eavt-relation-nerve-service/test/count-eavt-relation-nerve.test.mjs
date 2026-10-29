import assert from "node:assert/strict";
import test from "node:test";
import { countEavtRelationNerve } from "../scripts/count-eavt-relation-nerve.mjs";
test("a shared source between two claims makes one component and no cycle", () => {
  const rows = [{ e: "c1", a: "cites", v: "s1", t: 1 }, { e: "c2", a: "cites", v: "s1", t: 2 }, { e: "c1", a: "cites", v: "s1", t: 3 }];
  assert.deepEqual(countEavtRelationNerve({ rows, attribute: "cites" }), { type: "EavtRelationNerve", attribute: "cites", vertices: 3, edges: 2, h0: 1, h1: 0, chi: 1 });
});
test("two claims sharing two sources make one cycle, and chi equals h0 minus h1", () => {
  const rows = [{ e: "c1", a: "cites", v: "s1", t: 1 }, { e: "c1", a: "cites", v: "s2", t: 2 }, { e: "c2", a: "cites", v: "s1", t: 3 }, { e: "c2", a: "cites", v: "s2", t: 4 }, { e: "c3", a: "other", v: "s9", t: 5 }];
  const out = countEavtRelationNerve({ rows, attribute: "cites" });
  assert.equal(out.h1, 1);
  assert.equal(out.h0, 1);
  assert.equal(out.chi, out.h0 - out.h1);
  assert.equal(out.vertices, 4);
});
test("refuses missing arguments", () => assert.throws(() => countEavtRelationNerve({ rows: [] }), /rows and a non-empty attribute are required/u));
