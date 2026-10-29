# ask-eavt-cell
## Requirements
- `stratified-answer`: The operation returns an EavtCellAnswer record for one entity over a row array: the asserted and saturated row counts and the settled section (affirmed, denied, contradicted cells), optionally restricted to one attribute.
- `contested-flag`: The answer carries contested true exactly when the settled section holds at least one contradicted cell.
- `proof-tree`: The answer carries proofTree, eavt's resolveProofTree resolved from the entity over the same rows (root, content-addressed nodes, edges, missing, cycles, depth), so a reader can follow the path and not only the endpoint.
- `regime-tagged-answer`: The answer carries closure, eavt's stratify closure field ({saturation, transfer, kappa, regime}) unchanged, and a top-level regime equal to closure.regime, so a reader sees the proof kind of the answer directly.
## Prohibitions
- `missing-entity-refusal`: The operation must refuse requests whose entity is not a nonempty string or whose rows is not an array.
## Laws
- `eavt-braided-tower` | 561 Group org layering, EAVT custody | 2026-08-30 | .claude/rules/org-layering.md | Applies to every read of an eavt trace: asserted, saturated, and settled are separate derived passes, never one lumped fold. | The answer reports the three strata as eavt's stratify computes them and never stores or invents a stratum field.
- `closure-ordinal-regime` | Obsmetrologia | Closure/Regime.lean | Closure/Regime.lean (strict kappa < omega, Scott kappa = omega, transfinite-bounded omega < kappa < omega_1, aperiodic kappa >= omega_1) | Applies to every EavtCellAnswer's proof-kind tag. | The answer passes through stratify's closure and regime exactly; a finite trace's fold always reaches its fixed point in finitely many passes, so regime is always "strict" here and the operation never invents an aperiodic classification.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/ask-eavt-cell-service","packageVersion":"0.3.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt":"0.8.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/ask-eavt-cell.mjs
#!/usr/bin/env node
import { resolveProofTree, section, stratify } from "@red-cup-engineering/eavt";

/**
 * Answers one cell question over an eavt row array with the entity's asserted and saturated counts, its settled section, its proof tree, and the closure/regime of the answer's fold.
 * @param {object} request A record with rows, an entity, and an optional attribute.
 * @returns {object} An EavtCellAnswer record.
 * @throws {TypeError} When entity is not a nonempty string or rows is not an array.
 */
export function askEavtCell(request) {
  if (typeof request?.entity !== "string" || request.entity.length === 0 || !Array.isArray(request?.rows)) {
    throw new TypeError("entity and rows are required");
  }
  const attribute = typeof request.attribute === "string" ? request.attribute : null;
  const strata = stratify(request.entity, request.rows, { converse: {} });
  const settled = section(strata.settled);
  const keep = (cells) => cells.filter((cell) => attribute === null || cell.predicate === attribute).map((cell) => ({ predicate: cell.predicate, object: cell.object }));
  const answer = { affirmed: keep(settled.affirmed), denied: keep(settled.denied), contradicted: keep(settled.contradicted) };
  return {
    type: "EavtCellAnswer",
    entity: request.entity,
    attribute,
    asserted: strata.asserted.filter((row) => attribute === null || row.a === attribute).length,
    saturated: strata.saturated.filter((row) => attribute === null || row.a === attribute).length,
    settled: answer,
    contested: answer.contradicted.length > 0,
    proofTree: resolveProofTree({ rows: request.rows, root: request.entity }),
    closure: strata.closure,
    regime: strata.closure.regime,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("askEavtCell — Answers one cell question over an eavt row array with the entity's asserted and saturated counts, its settled section, its proof tree, and the closure/regime of the answer's fold.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(askEavtCell(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/ask-eavt-cell.test.mjs
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
```
## Examples
```json name="answers one affirmed cell"
{"input":{"rows":[{"e":"x","a":"is","v":"y","t":1}],"entity":"x","attribute":"is"},"output":{"type":"EavtCellAnswer","entity":"x","attribute":"is","asserted":1,"saturated":1,"settled":{"affirmed":[{"predicate":"is","object":"y"}],"denied":[],"contradicted":[]},"contested":false,"proofTree":{"root":"x","nodes":{"x":{"e":"x","a":"is","v":"y","t":1}},"edges":[],"missing":[],"cycles":[],"depth":0},"closure":{"saturation":1,"transfer":1,"kappa":1,"regime":"strict"},"regime":"strict"}}
```
## Traceability
- `stratified-answer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `node-esm-operation`
- `contested-flag` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `node-esm-operation`
- `proof-tree` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `node-esm-operation`
- `regime-tagged-answer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `closure-ordinal-regime`, `node-esm-operation`
- `missing-entity-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `node-esm-operation`
