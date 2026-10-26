# stratify-eavt-trace
## Requirements
- `derives-three-levels`: The operation returns `{entity, asserted, saturated, settled, closure}` for `request.subject` over `request.rows`: Level 0 `asserted` (the subject's raw deduped rows), Level 1 `saturated` (the subject's retraction-closed rows), Level 2 `settled` (`@red-cup-engineering/eavt-services-section`'s own settled-fiber shape), plus `closure` (the fold-pass counts and derived regime).
- `canonical-composition-order`: The operation composes σ then Δ (`settled = transfer(saturate(rows))`) — two separate passes, never one lumped fold — reproducing `fold`/`settle`'s own output for the subject exactly.
- `composes-eavt-stratify`: The operation delegates the whole three-level derivation to `@red-cup-engineering/eavt-services-section`'s own `stratify` export; it never re-derives saturation, transfer, or closure classification itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `subject`, `rows`, and optional `retract`/`converse` fields of its request.
## Prohibitions
- `missing-fields-refusal`: The operation must refuse (throw `TypeError`) a request whose `subject` is not a non-empty string, or whose `rows` is not an array.
- `no-second-stratification`: The operation must not compute saturation, transfer, or a closure ordinal/regime itself, nor call any stratification export other than `@red-cup-engineering/eavt-services-section`'s own `stratify`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own stratification step. | The three-level derived reading (asserted/saturated/settled) lives once, in `@red-cup-engineering/eavt-services-section`; this operation composes that export by exact pin rather than reimplementing it.
- `braided-tower-stratification` | 561 Group org layering, EAVT custody | 2026-08-30, 2026-04-04, 2026-04-06 | .claude/rules/org-layering.md | Applies to this whole operation source file. | A row's stratum is a derived reading of the trace, never a stored field; Level 0 asserted / Level 1 saturated = Fix(σ) / Level 2 settled = Fix(σ) ∩ Fix(Δ) are distinct strata never stored indistinguishably — this operation is the one export exposing all three at once.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/stratify-eavt-trace-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt-services-section":"0.8.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/stratify-eavt-trace.mjs
#!/usr/bin/env node
import { stratify } from "@red-cup-engineering/eavt-services-section";

/**
 * Derives the braided-tower three-level reading of one subject over an {e,a,v,t} trace, composing @red-cup-engineering/eavt-services-section's own stratify for the whole Level 0/1/2 derivation.
 * @param {object} request A record with `subject` (the entity to stratify), `rows` (an {e,a,v,t} row array, any order, the whole trace, not pre-filtered), and optional `retract` (passed to saturation) and `converse` (passed to transfer) exactly as eavt's own fold/settle accept them.
 * @returns {object} `{entity, asserted, saturated, settled, closure}` — asserted (Level 0), saturated (Level 1), settled (Level 2, eavt's own fold shape), and closure (the fold-pass counts, their max, and the derived regime name).
 * @throws {TypeError} When subject is not a non-empty string, rows is not an array, or a row is non-conformant.
 */
export function stratifyEavtTrace(request) {
  if (typeof request?.subject !== "string" || request.subject.length === 0) throw new TypeError("subject is required");
  if (!Array.isArray(request?.rows)) throw new TypeError("rows is required");
  const opts = {};
  if (Object.prototype.hasOwnProperty.call(request, "retract")) opts.retract = request.retract;
  if (Object.prototype.hasOwnProperty.call(request, "converse")) opts.converse = request.converse;
  return stratify(request.subject, request.rows, opts);
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "stratifyEavtTrace — Derives the braided-tower three-level reading of one subject over an {e,a,v,t} trace, composing @red-cup-engineering/eavt-services-section's own stratify for the whole Level 0/1/2 derivation.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(stratifyEavtTrace(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/stratify-eavt-trace.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { stratifyEavtTrace } from "../scripts/stratify-eavt-trace.mjs";

const ADDRESS = "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8";
const ROWS = [
  { e: ADDRESS, a: "named", v: "pebble", t: 1 },
  { e: ADDRESS, a: "named", v: null, t: 2 },
  { e: ADDRESS, a: "located-in", v: "riverbed", t: 3 },
];

test("derives asserted, saturated, and settled levels plus a strict closure", () => {
  const result = stratifyEavtTrace({ subject: ADDRESS, rows: ROWS });
  assert.equal(result.entity, ADDRESS);
  assert.deepEqual(result.asserted, ROWS);
  assert.deepEqual(result.saturated, [{ e: ADDRESS, a: "located-in", v: "riverbed", t: 3 }]);
  assert.deepEqual(
    result.settled.fiber.map((cell) => ({ predicate: cell.predicate, object: cell.object, value: { pos: cell.value.pos, neg: cell.value.neg } })),
    [{ predicate: "located-in", object: "riverbed", value: { pos: 1, neg: 0 } }],
  );
  assert.deepEqual(result.closure, { saturation: 1, transfer: 1, kappa: 1, regime: "strict" });
});

test("refuses a missing subject", () => {
  assert.throws(() => stratifyEavtTrace({ rows: ROWS }), /subject is required/u);
});

test("refuses a missing rows array", () => {
  assert.throws(() => stratifyEavtTrace({ subject: ADDRESS }), /rows is required/u);
});
```
## Examples
```json name="stratifies a subject whose earlier assertion was retracted"
{"input":{"subject":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","rows":[{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"named","v":"pebble","t":1},{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"named","v":null,"t":2},{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"located-in","v":"riverbed","t":3}]},"output":{"entity":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","asserted":[{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"named","v":"pebble","t":1},{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"named","v":null,"t":2},{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"located-in","v":"riverbed","t":3}],"saturated":[{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"located-in","v":"riverbed","t":3}],"settled":{"entity":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","fiber":[{"predicate":"located-in","object":"riverbed","value":{"pos":1,"neg":0,"evidence":[["ni:///sha-256;kWcuNZTy0UUoePLp0sLrYzk13OCIIeu90NFN997w5js"],[]]}}]},"closure":{"saturation":1,"transfer":1,"kappa":1,"regime":"strict"}}}
```
## Traceability
- `derives-three-levels` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `braided-tower-stratification`
- `canonical-composition-order` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `braided-tower-stratification`
- `composes-eavt-stratify` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-fields-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-stratification` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
