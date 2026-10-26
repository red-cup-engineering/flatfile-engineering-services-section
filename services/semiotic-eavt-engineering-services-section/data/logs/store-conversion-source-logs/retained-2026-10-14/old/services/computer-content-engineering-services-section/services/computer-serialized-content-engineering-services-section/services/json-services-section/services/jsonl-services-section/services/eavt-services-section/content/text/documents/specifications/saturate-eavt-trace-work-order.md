# saturate-eavt-trace
## Requirements
- `computes-fix-sigma`: The operation returns `{rows}`, where `rows` is the trace-wide, deduped, retraction-closed `{e,a,v,t}` rows of `request.rows` — Level 1, Fix(σ), of the braided-tower stratification.
- `retraction-toggle`: When `request.retract` is `false`, the operation returns the deduped rows unfiltered (retraction disabled); when `retract` is omitted or `true`, every tombstone row (`v === null`) and every earlier same-`(e,a)` positive row a later tombstone retracts is dropped.
- `composes-eavt-saturate`: The operation delegates the whole dedupe/retraction closure to `@red-cup-engineering/eavt-services-section`'s own `saturate` export; it never re-derives row identity, dedupe, or the tombstone law itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `rows` and optional `retract` fields of its request.
## Prohibitions
- `missing-rows-refusal`: The operation must refuse (throw `TypeError`) a request whose `rows` field is not an array.
- `no-second-saturation`: The operation must not compute row identity, dedupe rows, or apply a tombstone/retraction rule itself, nor call any saturation export other than `@red-cup-engineering/eavt-services-section`'s own `saturate`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own saturation step. | The σ nucleus (row-level retraction closure) lives once, in `@red-cup-engineering/eavt-services-section`; this operation composes that export by exact pin rather than reimplementing it.
- `braided-tower-stratification` | 561 Group org layering, EAVT custody | 2026-08-30, 2026-04-04, 2026-04-06 | .claude/rules/org-layering.md | Applies to this whole operation source file. | A row's stratum (Level 0 asserted / Level 1 saturated / Level 2 settled) is a derived reading of the trace, never a stored field; σ and Δ are separate nuclei, never one lumped fold — this operation exposes σ alone.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/saturate-eavt-trace-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt-services-section":"0.8.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/saturate-eavt-trace.mjs
#!/usr/bin/env node
import { saturate } from "@red-cup-engineering/eavt-services-section";

/**
 * Computes the σ nucleus (Level 1, Fix(σ)) of an {e,a,v,t} trace, composing @red-cup-engineering/eavt-services-section's own saturate for the whole trace-wide dedupe/retraction closure.
 * @param {object} request A record with `rows` (an {e,a,v,t} row array, any order) and optional `retract` (default true; false disables the tombstone law).
 * @returns {object} `{rows}` — the deduped, retraction-closed rows (trace-wide, Level 1).
 * @throws {TypeError} When rows is not an array, or a row is not a conformant {e,a,v,t} row.
 */
export function saturateEavtTrace(request) {
  if (!Array.isArray(request?.rows)) throw new TypeError("rows is required");
  const opts = {};
  if (Object.prototype.hasOwnProperty.call(request, "retract")) opts.retract = request.retract;
  return { rows: saturate(request.rows, opts) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "saturateEavtTrace — Computes the σ nucleus (Level 1, Fix(σ)) of an {e,a,v,t} trace, composing @red-cup-engineering/eavt-services-section's own saturate for the whole trace-wide dedupe/retraction closure.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(saturateEavtTrace(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/saturate-eavt-trace.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { saturateEavtTrace } from "../scripts/saturate-eavt-trace.mjs";

const ADDRESS = "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8";
const ROWS = [
  { e: ADDRESS, a: "named", v: "pebble", t: 1 },
  { e: ADDRESS, a: "named", v: null, t: 2 },
  { e: ADDRESS, a: "located-in", v: "riverbed", t: 3 },
];

test("drops a retracted predicate and every tombstone row", () => {
  assert.deepEqual(saturateEavtTrace({ rows: ROWS }), {
    rows: [{ e: ADDRESS, a: "located-in", v: "riverbed", t: 3 }],
  });
});

test("passes rows through deduped-only when retract is false", () => {
  assert.deepEqual(saturateEavtTrace({ rows: ROWS, retract: false }), { rows: ROWS });
});

test("refuses a missing rows array", () => {
  assert.throws(() => saturateEavtTrace({}), /rows is required/u);
});
```
## Examples
```json name="closes a retracted predicate out of the trace"
{"input":{"rows":[{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"named","v":"pebble","t":1},{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"named","v":null,"t":2},{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"located-in","v":"riverbed","t":3}]},"output":{"rows":[{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"located-in","v":"riverbed","t":3}]}}
```
## Traceability
- `computes-fix-sigma` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `braided-tower-stratification`
- `retraction-toggle` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `braided-tower-stratification`
- `composes-eavt-saturate` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-rows-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-saturation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
