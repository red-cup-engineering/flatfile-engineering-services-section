import assert from "node:assert/strict";
import test from "node:test";
import { countEavtContestedCells } from "../scripts/count-eavt-contested-cells.mjs";
test("counts a contradicted cell reached through a converse declaration", () => {
  const rows = [{ e: "is", a: "has-converse", v: "is-not", t: 0 }, { e: "x", a: "is", v: "y", t: 1 }, { e: "x", a: "is-not", v: "y", t: 2 }, { e: "z", a: "is", v: "y", t: 3 }];
  const out = countEavtContestedCells({ rows });
  assert.equal(out.contestedEntities, 1);
  assert.equal(out.contestedCells, 1);
  assert.deepEqual(out.contested[0], { entity: "x", cells: [{ predicate: "is", object: "y" }] });
  assert.ok(out.entities >= 2);
});
test("reports zero over an uncontested trace", () => {
  const out = countEavtContestedCells({ rows: [{ e: "x", a: "is", v: "y", t: 1 }] });
  assert.equal(out.contestedEntities, 0);
  assert.deepEqual(out.contested, []);
});
test("refuses missing rows", () => assert.throws(() => countEavtContestedCells({}), /rows are required/u));
