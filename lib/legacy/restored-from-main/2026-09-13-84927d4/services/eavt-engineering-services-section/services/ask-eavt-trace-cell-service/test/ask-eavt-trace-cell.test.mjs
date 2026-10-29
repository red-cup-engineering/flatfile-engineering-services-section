import assert from "node:assert/strict";
import test from "node:test";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { appendEavt } from "@red-cup-engineering/eavt";
import { askEavtTraceCell } from "../scripts/ask-eavt-trace-cell.mjs";
test("answers a cell over a trace file", () => {
  const dir = mkdtempSync(`${tmpdir()}/561-ask-eavt-trace-`);
  const trace = `${dir}/t.eavt`;
  appendEavt(trace, { e: "x", a: "is", v: "y", t: 1 });
  appendEavt(trace, { e: "x", a: "is", v: "z", t: 2 });
  const out = askEavtTraceCell({ trace, entity: "x", attribute: "is" });
  assert.equal(out.type, "EavtTraceCellAnswer");
  assert.equal(out.rows, 2);
  assert.equal(out.answer.asserted, 2);
  assert.deepEqual(out.answer.settled.affirmed, [{ predicate: "is", object: "y" }, { predicate: "is", object: "z" }]);
  rmSync(dir, { recursive: true, force: true });
});
test("reports an absent trace as a datum", () => {
  assert.deepEqual(askEavtTraceCell({ trace: "/nonexistent/561-group/none.eavt", entity: "x" }), { type: "EavtTraceAbsent", trace: "/nonexistent/561-group/none.eavt" });
});
test("refuses missing arguments", () => assert.throws(() => askEavtTraceCell({ trace: "/x" }), /a non-empty trace and entity are required/u));
test("reads only the entity's rows: an unrelated entity's row does not inflate the reported row count", () => {
  const dir = mkdtempSync(`${tmpdir()}/561-ask-eavt-trace-`);
  const trace = `${dir}/t.eavt`;
  appendEavt(trace, { e: "x", a: "is", v: "y", t: 1 });
  appendEavt(trace, { e: "unrelated", a: "is", v: "q", t: 1 });
  const out = askEavtTraceCell({ trace, entity: "x" });
  assert.equal(out.rows, 1, "only x's own row was read, not the unrelated entity's");
  rmSync(dir, { recursive: true, force: true });
});
