import assert from "node:assert/strict";
import test from "node:test";
import { askEavtCell } from "../scripts/ask-eavt-cell.mjs";
test("answers one affirmed cell", () => {
  const answer = askEavtCell({ rows: [{ e: "x", a: "is", v: "y", t: 1 }], entity: "x", attribute: "is" });
  assert.deepEqual(answer.settled.affirmed, [{ predicate: "is", object: "y" }]);
  assert.equal(answer.asserted, 1);
  assert.equal(answer.contested, false);
});
test("flags a contested cell through a converse declaration", () => {
  const rows = [{ e: "is", a: "has-converse", v: "is-not", t: 0 }, { e: "x", a: "is", v: "y", t: 1 }, { e: "x", a: "is-not", v: "y", t: 2 }];
  const answer = askEavtCell({ rows, entity: "x" });
  assert.equal(answer.contested, true);
  assert.deepEqual(answer.settled.contradicted, [{ predicate: "is", object: "y" }]);
});
test("carries the proof tree resolved from the entity", () => {
  const answer = askEavtCell({ rows: [{ e: "x", a: "is", v: "y", t: 1 }], entity: "x" });
  assert.equal(answer.proofTree.root, "x");
  assert.deepEqual(answer.proofTree.missing, []);
  assert.deepEqual(askEavtCell({ rows: [], entity: "zzz" }).proofTree.missing, ["zzz"]);
});
test("carries closure and a top-level regime equal to closure.regime", () => {
  const answer = askEavtCell({ rows: [{ e: "x", a: "is", v: "y", t: 1 }], entity: "x" });
  assert.deepEqual(answer.closure, { saturation: 1, transfer: 1, kappa: 1, regime: "strict" });
  assert.equal(answer.regime, "strict");
  assert.equal(answer.regime, answer.closure.regime);
});
test("refuses a missing entity", () => assert.throws(() => askEavtCell({ rows: [] }), /entity and rows are required/u));
