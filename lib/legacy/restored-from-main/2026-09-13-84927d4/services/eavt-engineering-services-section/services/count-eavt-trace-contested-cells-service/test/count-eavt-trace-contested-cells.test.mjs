import assert from "node:assert/strict";
import test from "node:test";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { appendEavt } from "@red-cup-engineering/eavt";
import { countEavtTraceContestedCells } from "../scripts/count-eavt-trace-contested-cells.mjs";
test("counts a contradicted cell in a trace file", () => {
  const dir = mkdtempSync(`${tmpdir()}/561-count-trace-`);
  const trace = `${dir}/t.eavt`;
  appendEavt(trace, { e: "is", a: "has-converse", v: "is-not", t: 0 });
  appendEavt(trace, { e: "x", a: "is", v: "y", t: 1 });
  appendEavt(trace, { e: "x", a: "is-not", v: "y", t: 2 });
  const out = countEavtTraceContestedCells({ trace });
  assert.equal(out.type, "EavtTraceContestedCellsCount");
  assert.equal(out.rows, 3);
  assert.equal(out.count.contestedEntities, 1);
  rmSync(dir, { recursive: true, force: true });
});
test("reports an absent trace as a datum", () => {
  assert.deepEqual(countEavtTraceContestedCells({ trace: "/nonexistent/561-group/none.eavt" }), { type: "EavtTraceAbsent", trace: "/nonexistent/561-group/none.eavt" });
});
test("refuses a missing trace", () => assert.throws(() => countEavtTraceContestedCells({}), /a non-empty trace is required/u));
