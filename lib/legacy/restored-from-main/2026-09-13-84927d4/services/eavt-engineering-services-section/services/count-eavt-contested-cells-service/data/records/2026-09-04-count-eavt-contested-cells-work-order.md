# count-eavt-contested-cells
## Requirements
- `contested-cells-counted`: Over an eavt row array the operation returns an EavtContestedCellsCount naming every entity whose settled section holds at least one contradicted cell, with that entity's contradicted cells (predicate and object), the count of contested entities, the count of contested cells, and the count of entities examined.
- `deterministic-order`: Entities and cells are listed in ascending lexical order so the count is a stable record.
- `one-pass-grouping`: Rows are grouped by entity once, and each entity is stratified over its own rows together with every has-converse declaration row, so the count over a trace of n rows costs one pass plus the per-entity folds, never a fold of all rows per entity.
## Prohibitions
- `missing-rows-refusal`: The operation must refuse a request whose rows is not an array.
## Laws
- `eavt-braided-tower` | 561 Group org layering, EAVT custody | 2026-08-30 | .claude/rules/org-layering.md | Applies to every read of an eavt trace: contradiction is a property of the settled stratum, never of a stored field. | A contested cell is one eavt's section reports as contradicted after stratify, and the count is derived per call from the rows.
- `held-contradiction` | Obsmetrologia, Language/Positing/LocalMldClassification.lean (localClInv) | 2026-09-04 | lib/obsmetrologia/Obsmetrologia/Language/Positing/LocalMldClassification.lean | Applies to what counts as contested. | The held contradiction is the FOUR position whose local invariant is (told-nothing false, held-contradiction true); this count is the corpus's number of such cells.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/count-eavt-contested-cells-service","packageVersion":"0.2.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt":"0.6.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/count-eavt-contested-cells.mjs
#!/usr/bin/env node
import { listEntities, section, stratify } from "@red-cup-engineering/eavt";

/**
 * Counts the entities and cells an eavt row array settles as contradicted.
 * @param {object} request A record with rows.
 * @returns {object} An EavtContestedCellsCount record.
 * @throws {TypeError} When rows is not an array.
 */
export function countEavtContestedCells(request) {
  if (!Array.isArray(request?.rows)) throw new TypeError("rows are required");
  const contested = [];
  const entities = listEntities(request.rows);
  const converse = request.rows.filter((row) => row.a === "has-converse");
  const byEntity = new Map();
  for (const row of request.rows) {
    if (!byEntity.has(row.e)) byEntity.set(row.e, []);
    byEntity.get(row.e).push(row);
  }
  for (const entity of entities) {
    const own = byEntity.get(entity) ?? [];
    const settled = section(stratify(entity, [...converse, ...own.filter((row) => row.a !== "has-converse")], { converse: {} }).settled);
    if (settled.contradicted.length === 0) continue;
    const cells = settled.contradicted.map((cell) => ({ predicate: cell.predicate, object: cell.object }));
    cells.sort((x, y) => `${x.predicate} ${x.object}`.localeCompare(`${y.predicate} ${y.object}`));
    contested.push({ entity, cells });
  }
  contested.sort((x, y) => x.entity.localeCompare(y.entity));
  return {
    type: "EavtContestedCellsCount",
    entities: entities.length,
    contestedEntities: contested.length,
    contestedCells: contested.reduce((sum, item) => sum + item.cells.length, 0),
    contested,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("countEavtContestedCells — Counts the entities and cells an eavt row array settles as contradicted.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(countEavtContestedCells(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/count-eavt-contested-cells.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { countEavtContestedCells } from "../scripts/count-eavt-contested-cells.mjs";
test("counts a contradicted cell reached through a converse declaration", () => {
  const rows = [{ e: "is", a: "has-converse", v: "is-not", t: 0 }, { e: "x", a: "is", v: "y", t: 1 }, { e: "x", a: "is-not", v: "y", t: 2 }, { e: "z", a: "is", v: "y", t: 3 }];
  const out = countEavtContestedCells({ rows });
  assert.equal(out.contestedEntities, 1);
  assert.equal(out.contestedCells, 1);
  assert.deepEqual(out.contested[0], { entity: "x", cells: [{ predicate: "is", object: "y" }] });
  assert.ok(out.entities >= 2);
});
test("reports zero over an uncontested trace", () => {
  const out = countEavtContestedCells({ rows: [{ e: "x", a: "is", v: "y", t: 1 }] });
  assert.equal(out.contestedEntities, 0);
  assert.deepEqual(out.contested, []);
});
test("refuses missing rows", () => assert.throws(() => countEavtContestedCells({}), /rows are required/u));
```
## Examples
```json name="uncontested rows"
{"input":{"rows":[{"e":"x","a":"is","v":"y","t":1}]},"output":{"type":"EavtContestedCellsCount","entities":1,"contestedEntities":0,"contestedCells":0,"contested":[]}}
```
## Traceability
- `contested-cells-counted` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `held-contradiction`, `node-esm-operation`
- `deterministic-order` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `held-contradiction`, `node-esm-operation`
- `one-pass-grouping` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `held-contradiction`, `node-esm-operation`
- `missing-rows-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eavt-braided-tower`, `held-contradiction`, `node-esm-operation`
