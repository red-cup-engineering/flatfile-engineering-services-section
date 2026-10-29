# count-eavt-trace-contested-cells
## Requirements
- `trace-contested-count`: The operation reads one eavt trace file and returns count-eavt-contested-cells' EavtContestedCellsCount over its rows, wrapped as an EavtTraceContestedCellsCount naming the trace and its row count.
- `absent-trace-datum`: When the trace file does not exist the operation returns an EavtTraceAbsent datum naming the trace instead of throwing.
## Prohibitions
- `missing-trace-refusal`: The operation must refuse a request whose trace is not a non-empty string.
## Laws
- `eavt-braided-tower` | 561 Group org layering, EAVT custody | 2026-08-30 | .claude/rules/org-layering.md | Applies to every read of an eavt trace. | The count is count-eavt-contested-cells' count over the rows eavt reads from the file; nothing is stored or invented.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to the composition of house operations. | The operation composes eavt's readEavtFile and count-eavt-contested-cells-service; it re-implements neither.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/count-eavt-trace-contested-cells-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt":"0.6.0","@red-cup-engineering/count-eavt-contested-cells-service":"0.2.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/count-eavt-trace-contested-cells.mjs
#!/usr/bin/env node
import { readEavtFile } from "@red-cup-engineering/eavt";
import { countEavtContestedCells } from "@red-cup-engineering/count-eavt-contested-cells-service";

/**
 * Reads one eavt trace file and counts the cells it settles as contradicted, or reports the trace absent.
 * @param {object} request A record with the trace file path.
 * @returns {object} An EavtTraceContestedCellsCount record, or an EavtTraceAbsent datum when the file does not exist.
 * @throws {TypeError} When trace is not a non-empty string.
 */
export function countEavtTraceContestedCells(request) {
  if (typeof request?.trace !== "string" || request.trace.length === 0) throw new TypeError("a non-empty trace is required");
  let rows;
  try {
    rows = readEavtFile(request.trace);
  } catch (error) {
    if (error?.code === "ENOENT") return { type: "EavtTraceAbsent", trace: request.trace };
    throw error;
  }
  return { type: "EavtTraceContestedCellsCount", trace: request.trace, rows: rows.length, count: countEavtContestedCells({ rows }) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("countEavtTraceContestedCells — Reads one eavt trace file and counts the cells it settles as contradicted, or reports the trace absent.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(countEavtTraceContestedCells(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/count-eavt-trace-contested-cells.test.mjs
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
```
## Examples
```json name="absent trace"
{"input":{"trace":"/nonexistent/561-group/none.eavt"},"output":{"type":"EavtTraceAbsent","trace":"/nonexistent/561-group/none.eavt"}}
```
## Traceability
- `trace-contested-count` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `fabricate-do-not-hand-write`, `node-esm-operation`
- `absent-trace-datum` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `fabricate-do-not-hand-write`, `node-esm-operation`
- `missing-trace-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `fabricate-do-not-hand-write`, `node-esm-operation`
