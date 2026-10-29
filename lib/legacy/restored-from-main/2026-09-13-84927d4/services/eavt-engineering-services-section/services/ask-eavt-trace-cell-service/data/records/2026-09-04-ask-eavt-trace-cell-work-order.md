# ask-eavt-trace-cell
## Requirements
- `trace-cell-answer`: The operation reads one eavt trace file and returns ask-eavt-cell's EavtCellAnswer for the entity over that trace's rows, optionally restricted to one attribute, wrapped as an EavtTraceCellAnswer naming the trace and the count of rows read to answer it.
- `absent-trace-datum`: When the trace file does not exist the operation returns an EavtTraceAbsent datum naming the trace instead of throwing.
- `indexed-entity-read`: The operation reads only the rows the entity's answer needs (via eavt's readEavtEntityRows, index-accelerated) rather than decoding every row of the trace.
## Prohibitions
- `missing-arguments-refusal`: The operation must refuse a request whose trace or entity is not a non-empty string.
## Laws
- `eavt-braided-tower` | 561 Group org layering, EAVT custody | 2026-08-30 | .claude/rules/org-layering.md | Applies to every read of an eavt trace: asserted, saturated, and settled are separate derived passes, never one lumped fold. | The answer is ask-eavt-cell's answer over the rows eavt reads from the file; nothing is stored or invented.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to the composition of house operations. | The operation composes eavt's readEavtEntityRows and ask-eavt-cell-service's askEavtCell; it re-implements neither.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/ask-eavt-trace-cell-service","packageVersion":"0.3.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt":"0.8.0","@red-cup-engineering/ask-eavt-cell-service":"0.3.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/ask-eavt-trace-cell.mjs
#!/usr/bin/env node
import { readEavtEntityRows } from "@red-cup-engineering/eavt";
import { askEavtCell } from "@red-cup-engineering/ask-eavt-cell-service";

/**
 * Reads one eavt trace file and answers a cell question over its rows, or reports the trace absent.
 * @param {object} request A record with the trace file path, an entity, and an optional attribute.
 * @returns {object} An EavtTraceCellAnswer record, or an EavtTraceAbsent datum when the file does not exist.
 * @throws {TypeError} When trace or entity is not a non-empty string.
 */
export function askEavtTraceCell(request) {
  if (typeof request?.trace !== "string" || request.trace.length === 0 || typeof request?.entity !== "string" || request.entity.length === 0) {
    throw new TypeError("a non-empty trace and entity are required");
  }
  let rows;
  try {
    rows = readEavtEntityRows({ path: request.trace, entity: request.entity });
  } catch (error) {
    if (error?.code === "ENOENT") return { type: "EavtTraceAbsent", trace: request.trace };
    throw error;
  }
  const answer = askEavtCell({ rows, entity: request.entity, attribute: request.attribute });
  return { type: "EavtTraceCellAnswer", trace: request.trace, rows: rows.length, answer };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("askEavtTraceCell — Reads one eavt trace file and answers a cell question over its rows, or reports the trace absent.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(askEavtTraceCell(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/ask-eavt-trace-cell.test.mjs
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
```
## Examples
```json name="absent trace"
{"input":{"trace":"/nonexistent/561-group/none.eavt","entity":"x"},"output":{"type":"EavtTraceAbsent","trace":"/nonexistent/561-group/none.eavt"}}
```
## Traceability
- `trace-cell-answer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `fabricate-do-not-hand-write`, `node-esm-operation`
- `absent-trace-datum` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `fabricate-do-not-hand-write`, `node-esm-operation`
- `indexed-entity-read` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `fabricate-do-not-hand-write`, `node-esm-operation`
- `missing-arguments-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `fabricate-do-not-hand-write`, `node-esm-operation`
