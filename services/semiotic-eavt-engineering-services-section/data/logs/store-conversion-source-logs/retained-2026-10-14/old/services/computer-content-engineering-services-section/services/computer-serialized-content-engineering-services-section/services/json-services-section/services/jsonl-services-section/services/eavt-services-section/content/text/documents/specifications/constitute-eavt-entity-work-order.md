# constitute-eavt-entity
## Requirements
- `births-genesis-row-with-derived-address`: The operation returns `{address, genesisRow}`, where `genesisRow` is the `{e,a,v,t}` genesis row for `kind`/`attributes`/`t` with `e` rewritten to the derived `<kind>:<digest>` address, and `address` is that same string.
- `deterministic-address`: The same `kind`, `attributes`, and `t` always yield the same `address` (content-addressed, never randomized).
- `composes-eavt-constitute-entity`: The operation delegates the whole genesis-row build and digest/address derivation to `@red-cup-engineering/eavt-services-section`'s own `constituteEntity` export; it never re-derives the placeholder-`e` hashing or the `<kind>:<digest>` join itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `kind`, `attributes`, and `t` fields of its request.
## Prohibitions
- `missing-fields-refusal`: The operation must refuse (throw `TypeError`) a request whose `kind` is not a non-empty string, or that has no `attributes` field, or that has no `t` field.
- `no-second-address-derivation`: The operation must not compute a row digest, hash a placeholder-`e` row, or join `kind` and a digest with `:` itself, nor call any entity-constitution export other than `@red-cup-engineering/eavt-services-section`'s own `constituteEntity`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own address-derivation step. | Entity constitution's genesis-row/address math lives once, in `@red-cup-engineering/eavt-services-section`; this operation composes that export by exact pin rather than reimplementing it.
- `eavt-custody-standalone-section` | 561 Group org layering, EAVT custody | 2026-08-30 | .claude/rules/org-layering.md | Applies to this whole operation source file. | Plain EAVT, including entity constitution, is its own topic section under computer-data custody; this operation is a satellite service composing that section's published algebra, never a parallel reimplementation.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `rfc-6920-named-information` | IETF | RFC 6920, April 2013 | https://www.rfc-editor.org/rfc/rfc6920 | Applies to the digest half of the `address` field this operation reports. | The entity address's digest component is the RFC 6920 base64url SHA-256 digest of the genesis row's placeholder-`e` form, computed by `@red-cup-engineering/eavt-services-section`'s own `rowId`/`niUriDigest`, never a locally re-derived hash.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/constitute-eavt-entity-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt-services-section":"0.8.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/constitute-eavt-entity.mjs
#!/usr/bin/env node
import { constituteEntity } from "@red-cup-engineering/eavt-services-section";

/**
 * Births one entity's genesis row and its derived `<kind>:<digest>` address, composing @red-cup-engineering/eavt-services-section's own constituteEntity for the whole digest/address derivation.
 * @param {object} request A record with `kind` (a plain-noun string, no ":"), `attributes` (a JSON object, not null and not an array), and `t` (the genesis row's transaction/witness value).
 * @returns {object} `{address, genesisRow}` — address is the derived `<kind>:<digest>` entity address; genesisRow is the {e,a,v,t} row with `e` rewritten to that address.
 * @throws {TypeError} When kind is not a non-empty string, attributes or t is missing, or eavt's own constituteEntity refuses the input.
 */
export function constituteEavtEntity(request) {
  if (typeof request?.kind !== "string" || request.kind.length === 0) throw new TypeError("kind is required");
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "attributes")) throw new TypeError("attributes is required");
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "t")) throw new TypeError("t is required");
  return constituteEntity({ kind: request.kind, attributes: request.attributes, t: request.t });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "constituteEavtEntity — Births one entity's genesis row and its derived `<kind>:<digest>` address, composing @red-cup-engineering/eavt-services-section's own constituteEntity for the whole digest/address derivation.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(constituteEavtEntity(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/constitute-eavt-entity.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { constituteEavtEntity } from "../scripts/constitute-eavt-entity.mjs";

test("births a genesis row with the derived kind:digest address", () => {
  const result = constituteEavtEntity({ kind: "thing", attributes: { name: "pebble" }, t: 1 });
  assert.deepEqual(result, {
    address: "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
    genesisRow: { e: "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8", a: "constituted", v: { name: "pebble" }, t: 1 },
  });
});

test("is deterministic: the same kind/attributes/t always yields the same address", () => {
  const first = constituteEavtEntity({ kind: "thing", attributes: { name: "pebble" }, t: 1 });
  const second = constituteEavtEntity({ kind: "thing", attributes: { name: "pebble" }, t: 1 });
  assert.equal(first.address, second.address);
});

test("refuses a missing kind", () => {
  assert.throws(() => constituteEavtEntity({ attributes: {}, t: 1 }), /kind is required/u);
});

test("refuses a missing attributes", () => {
  assert.throws(() => constituteEavtEntity({ kind: "thing", t: 1 }), /attributes is required/u);
});

test("refuses a missing t", () => {
  assert.throws(() => constituteEavtEntity({ kind: "thing", attributes: {} }), /t is required/u);
});
```
## Examples
```json name="constitutes a thing entity"
{"input":{"kind":"thing","attributes":{"name":"pebble"},"t":1},"output":{"address":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","genesisRow":{"e":"thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8","a":"constituted","v":{"name":"pebble"},"t":1}}}
```
## Traceability
- `births-genesis-row-with-derived-address` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-6920-named-information`
- `deterministic-address` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-6920-named-information`
- `composes-eavt-constitute-entity` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `eavt-custody-standalone-section`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-fields-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-address-derivation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
