# filter-eavt-rows-by-consent
## Requirements
- `consent-filtered-rows`: Given eavt rows and an audience, the operation returns the rows whose entity has a consent row (attribute consent) admitting that audience, together with the counts of rows admitted and withheld and the entities withheld; a consent row's value is either the string "public" (every audience) or an array of audience names, and the latest consent row by t for an entity is the one that binds.
- `default-withheld`: An entity with no consent row is withheld: absence of consent is not consent.
- `consent-rows-kept`: Consent rows themselves are returned only for admitted entities, so a reader learns nothing about withheld entities beyond their count.
## Prohibitions
- `missing-arguments-refusal`: The operation must refuse a request whose rows is not an array or whose audience is not a non-empty string.
## Laws
- `care-authority-to-control` | Global Indigenous Data Alliance, CARE Principles for Indigenous Data Governance (Authority to control) | 2019 | https://www.gida-global.org/care | Applies to the default and to what a filtered read reveals. | Data about a people is released on that people's terms: absence of a consent row withholds, and a withheld entity is reported only as a count.
- `eavt-vocabulary-not-object-format` | 561 Group org layering, EAVT custody | 2026-08-30 | .claude/rules/org-layering.md | Applies to how consent is said. | Consent is an attribute over the entity, never a field on other rows or an object format.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
- `consent-vocabulary` [nonblocking]: Whether the audience names come from the org's actor addresses, its offices, or a CARE-derived vocabulary; the filter treats them as opaque names in this first form.
## Package
```json
{"packageName":"@red-cup-engineering/filter-eavt-rows-by-consent-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/filter-eavt-rows-by-consent.mjs
#!/usr/bin/env node
/**
 * Filters eavt rows to the entities whose latest consent row admits the audience, withholding the rest and reporting only their count.
 * @param {object} request A record with rows and an audience name.
 * @returns {object} An EavtConsentFilteredRows record.
 * @throws {TypeError} When rows is not an array or audience is not a non-empty string.
 */
export function filterEavtRowsByConsent(request) {
  if (!Array.isArray(request?.rows) || typeof request?.audience !== "string" || request.audience.length === 0) {
    throw new TypeError("rows and a non-empty audience are required");
  }
  const consent = new Map();
  for (const row of request.rows) {
    if (row.a !== "consent") continue;
    const known = consent.get(row.e);
    if (known === undefined || String(row.t) >= String(known.t)) consent.set(row.e, row);
  }
  const admits = (row) => row !== undefined && (row.v === "public" || (Array.isArray(row.v) && row.v.includes(request.audience)));
  const admitted = [];
  const withheldEntities = new Set();
  for (const row of request.rows) {
    if (admits(consent.get(row.e))) admitted.push(row);
    else withheldEntities.add(row.e);
  }
  return {
    type: "EavtConsentFilteredRows",
    audience: request.audience,
    admitted: admitted.length,
    withheld: request.rows.length - admitted.length,
    withheldEntities: withheldEntities.size,
    rows: admitted,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("filterEavtRowsByConsent — Filters eavt rows to the entities whose latest consent row admits the audience, withholding the rest and reporting only their count.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(filterEavtRowsByConsent(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/filter-eavt-rows-by-consent.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { filterEavtRowsByConsent } from "../scripts/filter-eavt-rows-by-consent.mjs";
const rows = [
  { e: "x", a: "consent", v: "public", t: 1 }, { e: "x", a: "is", v: "y", t: 2 },
  { e: "z", a: "consent", v: ["band-members"], t: 1 }, { e: "z", a: "is", v: "w", t: 2 },
  { e: "q", a: "is", v: "r", t: 2 },
];
test("admits public entities and audience-listed entities, withholds the rest", () => {
  const out = filterEavtRowsByConsent({ rows, audience: "band-members" });
  assert.equal(out.admitted, 4);
  assert.equal(out.withheld, 1);
  assert.equal(out.withheldEntities, 1);
  assert.ok(out.rows.every((row) => row.e !== "q"));
});
test("an audience outside the list sees only public entities, and withheld entities are a count", () => {
  const out = filterEavtRowsByConsent({ rows, audience: "anyone" });
  assert.deepEqual(out.rows.map((row) => row.e), ["x", "x"]);
  assert.equal(out.withheldEntities, 2);
});
test("the latest consent row binds", () => {
  const out = filterEavtRowsByConsent({ rows: [{ e: "x", a: "consent", v: "public", t: 1 }, { e: "x", a: "consent", v: [], t: 5 }, { e: "x", a: "is", v: "y", t: 6 }], audience: "anyone" });
  assert.equal(out.admitted, 0);
});
test("refuses missing arguments", () => assert.throws(() => filterEavtRowsByConsent({ rows: [] }), /rows and a non-empty audience are required/u));
```
## Examples
```json name="public and withheld"
{"input":{"rows":[{"e":"x","a":"consent","v":"public","t":1},{"e":"x","a":"is","v":"y","t":2},{"e":"q","a":"is","v":"r","t":2}],"audience":"anyone"},"output":{"type":"EavtConsentFilteredRows","audience":"anyone","admitted":2,"withheld":1,"withheldEntities":1,"rows":[{"e":"x","a":"consent","v":"public","t":1},{"e":"x","a":"is","v":"y","t":2}]}}
```
## Traceability
- `consent-filtered-rows` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `care-authority-to-control`, `eavt-vocabulary-not-object-format`, `node-esm-operation`
- `default-withheld` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `care-authority-to-control`, `eavt-vocabulary-not-object-format`, `node-esm-operation`
- `consent-rows-kept` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `care-authority-to-control`, `eavt-vocabulary-not-object-format`, `node-esm-operation`
- `missing-arguments-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `care-authority-to-control`, `eavt-vocabulary-not-object-format`, `node-esm-operation`
