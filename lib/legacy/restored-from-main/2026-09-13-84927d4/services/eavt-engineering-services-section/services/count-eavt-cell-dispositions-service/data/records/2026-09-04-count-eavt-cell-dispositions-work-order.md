# count-eavt-cell-dispositions
## Requirements
- `dispositions-counted`: For one entity over an eavt row array, optionally restricted to one attribute, the operation returns an EavtCellDispositions record: the asserted rows of the cell, and for each the distinct witnesses (values of witnessed-by rows whose entity is that row's content id) and distinct acknowledgers (values of acknowledged-by rows whose entity is that row's content id), with totals wit (asserted rows plus distinct witnesses, since the assertion is the first witness) and ack (distinct acknowledgers).
- `rows-about-rows`: Witness and acknowledgement are rows whose entity is the claim row's rowId, never fields on the claim row, so the eavt row contract {e,a,v,t} is untouched.
- `deterministic-order`: Claims are listed in row order and witnesses and acknowledgers in ascending lexical order.
## Prohibitions
- `missing-entity-refusal`: The operation must refuse a request whose entity is not a non-empty string or whose rows is not an array.
## Laws
- `wit-at-asserted-stratum` | 561 Group, note on acknowledgement beside WIT (the session's synthesis, inference) | 2026-09-04 | science-services-section/services/social-science-services-section/.../monetary-economics/.../2026-09-04-note-on-acknowledgement-beside-wit.md | Applies to what wit counts. | WIT is counted at the asserted stratum: one witnessed distinction-step spent by the party making the change; the assertion itself is the first witness.
- `ack-by-another-party` | 561 Group, note on acknowledgement beside WIT (the session's synthesis, inference) | 2026-09-04 | the same note | Applies to what ack counts. | ACK is the act, by a party other than the asserter, that moves an output toward saturation (Fix sigma); it is counted as distinct acknowledgers of the claim row.
- `eavt-vocabulary-not-object-format` | 561 Group org layering, EAVT custody | 2026-08-30 | .claude/rules/org-layering.md | Applies to how a disposition is said. | A vocabulary of attributes, never an object format, is how an action-kind is said; witnessed-by and acknowledged-by are attributes over the row's content id.
## Standards
- `rfc-6920-ni` | IETF | RFC 6920 | https://www.rfc-editor.org/rfc/rfc6920 | Applies to the entity of a disposition row. | The claim row is addressed by eavt's rowId, its ni: URI over canonical CBOR.
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
- `ack-attribute-name` [nonblocking]: Whether the corpus will say uptake with acknowledged-by or with a richer uptake vocabulary from the speech-act carriers; the attribute names here are the first form.
## Package
```json
{"packageName":"@red-cup-engineering/count-eavt-cell-dispositions-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt":"0.7.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/count-eavt-cell-dispositions.mjs
#!/usr/bin/env node
import { rowId } from "@red-cup-engineering/eavt";

/**
 * Counts the witnesses and acknowledgers of one entity's asserted cells, read from rows about each claim row's content id.
 * @param {object} request A record with rows, an entity, and an optional attribute.
 * @returns {object} An EavtCellDispositions record.
 * @throws {TypeError} When entity is not a non-empty string or rows is not an array.
 */
export function countEavtCellDispositions(request) {
  if (typeof request?.entity !== "string" || request.entity.length === 0 || !Array.isArray(request?.rows)) {
    throw new TypeError("entity and rows are required");
  }
  const attribute = typeof request.attribute === "string" ? request.attribute : null;
  const about = new Map();
  for (const row of request.rows) {
    if (row.a !== "witnessed-by" && row.a !== "acknowledged-by") continue;
    if (!about.has(row.e)) about.set(row.e, { witnesses: new Set(), acknowledgers: new Set() });
    about.get(row.e)[row.a === "witnessed-by" ? "witnesses" : "acknowledgers"].add(String(row.v));
  }
  const claims = [];
  for (const row of request.rows) {
    if (row.e !== request.entity || row.a === "witnessed-by" || row.a === "acknowledged-by") continue;
    if (attribute !== null && row.a !== attribute) continue;
    const id = rowId(row);
    const dispositions = about.get(id) ?? { witnesses: new Set(), acknowledgers: new Set() };
    claims.push({ id, predicate: row.a, object: row.v, witnesses: [...dispositions.witnesses].sort(), acknowledgers: [...dispositions.acknowledgers].sort() });
  }
  return {
    type: "EavtCellDispositions",
    entity: request.entity,
    attribute,
    asserted: claims.length,
    wit: claims.reduce((sum, claim) => sum + 1 + claim.witnesses.length, 0),
    ack: claims.reduce((sum, claim) => sum + claim.acknowledgers.length, 0),
    claims,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("countEavtCellDispositions — Counts the witnesses and acknowledgers of one entity's asserted cells, read from rows about each claim row's content id.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(countEavtCellDispositions(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/count-eavt-cell-dispositions.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { rowId } from "@red-cup-engineering/eavt";
import { countEavtCellDispositions } from "../scripts/count-eavt-cell-dispositions.mjs";
const claim = { e: "x", a: "is", v: "y", t: 1 };
const id = rowId(claim);
test("counts witnesses and acknowledgers addressed by the claim row's content id", () => {
  const rows = [claim, { e: id, a: "witnessed-by", v: "actor:b", t: 2 }, { e: id, a: "acknowledged-by", v: "actor:c", t: 3 }, { e: id, a: "acknowledged-by", v: "actor:c", t: 4 }, { e: "x", a: "is", v: "z", t: 5 }];
  const out = countEavtCellDispositions({ rows, entity: "x", attribute: "is" });
  assert.equal(out.asserted, 2);
  assert.equal(out.wit, 3);
  assert.equal(out.ack, 1);
  assert.deepEqual(out.claims[0], { id, predicate: "is", object: "y", witnesses: ["actor:b"], acknowledgers: ["actor:c"] });
});
test("an unacknowledged assertion counts one wit and zero ack", () => {
  const out = countEavtCellDispositions({ rows: [claim], entity: "x" });
  assert.equal(out.wit, 1);
  assert.equal(out.ack, 0);
});
test("refuses a missing entity", () => assert.throws(() => countEavtCellDispositions({ rows: [] }), /entity and rows are required/u));
```
## Examples
```json name="one acknowledged claim"
{"input":{"rows":[{"e":"x","a":"is","v":"y","t":1},{"e":"ni:///sha-256;riMYpPPJFxRLlaFoFrKKcKhkVhKHQl_UnjXjcrQQ7NQ","a":"acknowledged-by","v":"actor:c","t":2}],"entity":"x","attribute":"is"},"output":{"type":"EavtCellDispositions","entity":"x","attribute":"is","asserted":1,"wit":1,"ack":1,"claims":[{"id":"ni:///sha-256;riMYpPPJFxRLlaFoFrKKcKhkVhKHQl_UnjXjcrQQ7NQ","predicate":"is","object":"y","witnesses":[],"acknowledgers":["actor:c"]}]}}
```
## Traceability
- `dispositions-counted` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `wit-at-asserted-stratum`, `ack-by-another-party`, `eavt-vocabulary-not-object-format`, `rfc-6920-ni`, `node-esm-operation`
- `rows-about-rows` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `wit-at-asserted-stratum`, `ack-by-another-party`, `eavt-vocabulary-not-object-format`, `rfc-6920-ni`, `node-esm-operation`
- `deterministic-order` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `wit-at-asserted-stratum`, `ack-by-another-party`, `eavt-vocabulary-not-object-format`, `rfc-6920-ni`, `node-esm-operation`
- `missing-entity-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `wit-at-asserted-stratum`, `ack-by-another-party`, `eavt-vocabulary-not-object-format`, `rfc-6920-ni`, `node-esm-operation`
