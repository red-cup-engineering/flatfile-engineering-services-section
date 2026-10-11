# transfer-eavt-trace
## Requirements
- `computes-fix-delta`: The operation returns `{entity, fiber}` (exactly `@red-cup-engineering/eavt-services-section`'s own settled-fiber shape) for `request.subject` over `request.rows`, WITHOUT reading retraction — Fix(Δ) of the braided-tower stratification, "what every cell would hold if retraction never happened."
- `converse-toggle`: When `request.converse` is present (even `{}`), a declared converse pair redirects a row's evidence onto the negative face of its positive predicate's cell, merged with any in-trace `{a:"has-converse"}` declaration row; when `request.converse` is absent, no redirection happens.
- `composes-eavt-transfer`: The operation delegates the whole charge-accumulation/converse-redirect closure to `@red-cup-engineering/eavt-services-section`'s own `transfer` export; it never re-derives cell accumulation, the bilattice join, or the converse law itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `subject`, `rows`, and optional `converse` fields of its request.
## Prohibitions
- `missing-fields-refusal`: The operation must refuse (throw `TypeError`) a request whose `subject` is not a non-empty string, or whose `rows` is not an array.
- `no-second-accumulation`: The operation must not accumulate cell charges, join evidence, or apply a converse-redirect rule itself, nor call any transfer export other than `@red-cup-engineering/eavt-services-section`'s own `transfer`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own transfer step. | The Δ nucleus (charge-accumulation/converse-transfer closure) lives once, in `@red-cup-engineering/eavt-services-section`; this operation composes that export by exact pin rather than reimplementing it.
- `braided-tower-stratification` | 561 Group org layering, EAVT custody | 2026-08-30, 2026-04-04, 2026-04-06 | .claude/rules/org-layering.md | Applies to this whole operation source file. | A row's stratum (Level 0 asserted / Level 1 saturated / Level 2 settled) is a derived reading of the trace, never a stored field; σ and Δ are separate nuclei, never one lumped fold — this operation exposes Δ alone.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/transfer-eavt-trace-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt-services-section":"0.8.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/transfer-eavt-trace.mjs
#!/usr/bin/env node
import { transfer } from "@red-cup-engineering/eavt-services-section";

/**
 * Computes the Δ nucleus (Fix(Δ), the transfer-stable converse-closed sub-fiber) for one subject over an {e,a,v,t} trace, composing @red-cup-engineering/eavt-services-section's own transfer for the whole charge-accumulation/converse-redirect closure. Reads no retraction — feed it a saturated trace, or use stratify-eavt-trace, for the canonical σ-inside/Δ-outside settle order.
 * @param {object} request A record with `subject` (the entity to accumulate), `rows` (an {e,a,v,t} row array, any order, may span multiple subjects), and optional `converse` (a `{opposingPredicate: positivePredicate}` map; its mere presence, even `{}`, activates the legacy redirect lane).
 * @returns {object} `{entity, fiber}` — exactly eavt's own settled-fiber shape.
 * @throws {TypeError} When subject is not a non-empty string, rows is not an array, or a row is non-conformant.
 */
export function transferEavtTrace(request) {
  if (typeof request?.subject !== "string" || request.subject.length === 0) throw new TypeError("subject is required");
  if (!Array.isArray(request?.rows)) throw new TypeError("rows is required");
  const opts = {};
  if (Object.prototype.hasOwnProperty.call(request, "converse")) opts.converse = request.converse;
  return transfer(request.subject, request.rows, opts);
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "transferEavtTrace — Computes the Δ nucleus (Fix(Δ), the transfer-stable converse-closed sub-fiber) for one subject over an {e,a,v,t} trace, composing @red-cup-engineering/eavt-services-section's own transfer for the whole charge-accumulation/converse-redirect closure. Reads no retraction — feed it a saturated trace, or use stratify-eavt-trace, for the canonical σ-inside/Δ-outside settle order.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(transferEavtTrace(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/transfer-eavt-trace.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { transferEavtTrace } from "../scripts/transfer-eavt-trace.mjs";

const ADDRESS = "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8";
const ROWS = [
  { e: ADDRESS, a: "named", v: "pebble", t: 1 },
  { e: ADDRESS, a: "named", v: null, t: 2 },
  { e: ADDRESS, a: "located-in", v: "riverbed", t: 3 },
];

test("accumulates every positive-value row into a settled fiber, ignoring retraction", () => {
  const result = transferEavtTrace({ subject: ADDRESS, rows: ROWS });
  assert.equal(result.entity, ADDRESS);
  assert.deepEqual(
    result.fiber.map((cell) => ({ predicate: cell.predicate, object: cell.object, value: { pos: cell.value.pos, neg: cell.value.neg } })),
    [
      { predicate: "named", object: "pebble", value: { pos: 1, neg: 0 } },
      { predicate: "located-in", object: "riverbed", value: { pos: 1, neg: 0 } },
    ],
  );
});

test("refuses a missing subject", () => {
  assert.throws(() => transferEavtTrace({ rows: ROWS }), /subject is required/u);
});

test("refuses a missing rows array", () => {
  assert.throws(() => transferEavtTrace({ subject: ADDRESS }), /rows is required/u);
});
```
## Examples
```json name="accumulates a subject's rows into a settled fiber"
{"input":{"subject":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","rows":[{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"located-in","v":"riverbed","t":3}]},"output":{"entity":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","fiber":[{"predicate":"located-in","object":"riverbed","value":{"pos":1,"neg":0,"evidence":[["ni:///sha-256;kWcuNZTy0UUoePLp0sLrYzk13OCIIeu90NFN997w5js"],[]]}}]}}
```
## Traceability
- `computes-fix-delta` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `braided-tower-stratification`
- `converse-toggle` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `braided-tower-stratification`
- `composes-eavt-transfer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-fields-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-accumulation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
