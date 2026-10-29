import assert from "node:assert/strict";
import test from "node:test";
import { filterEavtRowsByConsent } from "../scripts/filter-eavt-rows-by-consent.mjs";
const rows = [
  { e: "x", a: "consent", v: "public", t: 1 }, { e: "x", a: "is", v: "y", t: 2 },
  { e: "z", a: "consent", v: ["band-members"], t: 1 }, { e: "z", a: "is", v: "w", t: 2 },
  { e: "q", a: "is", v: "r", t: 2 },
];
test("admits public entities and audience-listed entities, withholds the rest", () => {
  const out = filterEavtRowsByConsent({ rows, audience: "band-members" });
  assert.equal(out.admitted, 4);
  assert.equal(out.withheld, 1);
  assert.equal(out.withheldEntities, 1);
  assert.ok(out.rows.every((row) => row.e !== "q"));
});
test("an audience outside the list sees only public entities, and withheld entities are a count", () => {
  const out = filterEavtRowsByConsent({ rows, audience: "anyone" });
  assert.deepEqual(out.rows.map((row) => row.e), ["x", "x"]);
  assert.equal(out.withheldEntities, 2);
});
test("the latest consent row binds", () => {
  const out = filterEavtRowsByConsent({ rows: [{ e: "x", a: "consent", v: "public", t: 1 }, { e: "x", a: "consent", v: [], t: 5 }, { e: "x", a: "is", v: "y", t: 6 }], audience: "anyone" });
  assert.equal(out.admitted, 0);
});
test("refuses missing arguments", () => assert.throws(() => filterEavtRowsByConsent({ rows: [] }), /rows and a non-empty audience are required/u));
