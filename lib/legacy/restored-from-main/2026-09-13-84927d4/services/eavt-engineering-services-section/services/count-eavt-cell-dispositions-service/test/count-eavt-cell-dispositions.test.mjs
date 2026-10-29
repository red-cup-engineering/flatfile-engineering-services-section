import assert from "node:assert/strict";
import test from "node:test";
import { rowId } from "@red-cup-engineering/eavt";
import { countEavtCellDispositions } from "../scripts/count-eavt-cell-dispositions.mjs";
const claim = { e: "x", a: "is", v: "y", t: 1 };
const id = rowId(claim);
test("counts witnesses and acknowledgers addressed by the claim row's content id", () => {
  const rows = [claim, { e: id, a: "witnessed-by", v: "actor:b", t: 2 }, { e: id, a: "acknowledged-by", v: "actor:c", t: 3 }, { e: id, a: "acknowledged-by", v: "actor:c", t: 4 }, { e: "x", a: "is", v: "z", t: 5 }];
  const out = countEavtCellDispositions({ rows, entity: "x", attribute: "is" });
  assert.equal(out.asserted, 2);
  assert.equal(out.wit, 3);
  assert.equal(out.ack, 1);
  assert.deepEqual(out.claims[0], { id, predicate: "is", object: "y", witnesses: ["actor:b"], acknowledgers: ["actor:c"] });
});
test("an unacknowledged assertion counts one wit and zero ack", () => {
  const out = countEavtCellDispositions({ rows: [claim], entity: "x" });
  assert.equal(out.wit, 1);
  assert.equal(out.ack, 0);
});
test("refuses a missing entity", () => assert.throws(() => countEavtCellDispositions({ rows: [] }), /entity and rows are required/u));
