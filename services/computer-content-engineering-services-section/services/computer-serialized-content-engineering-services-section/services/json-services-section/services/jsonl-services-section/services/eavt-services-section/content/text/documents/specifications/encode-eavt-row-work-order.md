# encode-eavt-row
## Requirements
- `row-to-on-disk-line`: The operation returns `{line}`, where `line` is the exact bytes `@red-cup-engineering/eavt-services-section` appends for one row: base64 of the row's RFC 8949 core-deterministic canonical CBOR encoding.
- `composes-eavt-encode-row`: The operation delegates the whole row-contract check and canonical-CBOR/base64 encoding to `@red-cup-engineering/eavt-services-section`'s own `encodeRow` export; it never calls a CBOR encoder or `Buffer`-to-base64 conversion itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `row` field of its request.
## Prohibitions
- `missing-row-refusal`: The operation must refuse (throw `TypeError`) a request with no `row` field, or whose `row` is not exactly `{e,a,v,t}`.
- `no-second-encoder`: The operation must not encode CBOR, canonicalize a value, or base64-encode a row's bytes itself, nor call any row-encoding export other than `@red-cup-engineering/eavt-services-section`'s own `encodeRow`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own encoding step. | The row's one on-disk encoding lives once, in `@red-cup-engineering/eavt-services-section` (composing `@red-cup-engineering/cbor-codec-service` in turn); this operation composes eavt's export by exact pin rather than reimplementing any of it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `rfc-8949-cbor` | IETF | RFC 8949, December 2020 | https://www.rfc-editor.org/rfc/rfc8949 | Applies to the bytes the `line` field encodes (base64-of-canonical-CBOR). | The operation's output is exactly the RFC 8949 core-deterministic encoding `@red-cup-engineering/eavt-services-section`'s own `encodeRow` produces for a conformant row, base64-wrapped for newline safety; it neither widens nor narrows that profile.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/encode-eavt-row-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt-services-section":"0.8.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/encode-eavt-row.mjs
#!/usr/bin/env node
import { encodeRow } from "@red-cup-engineering/eavt-services-section";

/**
 * Encodes one {e,a,v,t} row to its on-disk line, composing @red-cup-engineering/eavt-services-section's own encodeRow for the whole row-contract check and canonical-CBOR/base64 encoding.
 * @param {object} request A record with `row` (an {e,a,v,t} row).
 * @returns {object} `{line}` — base64 of the row's canonical CBOR encoding, the exact bytes eavt appends for one row.
 * @throws {TypeError} When request.row is missing, or not exactly {e,a,v,t}.
 */
export function encodeEavtRow(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "row")) throw new TypeError("row is required");
  return { line: encodeRow(request.row) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "encodeEavtRow — Encodes one {e,a,v,t} row to its on-disk line, composing @red-cup-engineering/eavt-services-section's own encodeRow for the whole canonical-CBOR/base64 encoding.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(encodeEavtRow(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/encode-eavt-row.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { encodeEavtRow } from "../scripts/encode-eavt-row.mjs";

test("encodes a conformant row to its base64-canonical-CBOR line", () => {
  const result = encodeEavtRow({ row: { e: "thing:pebble", a: "named", v: "pebble", t: 1 } });
  assert.deepEqual(result, { line: "pGFhZW5hbWVkYWVsdGhpbmc6cGViYmxlYXQBYXZmcGViYmxl" });
});

test("refuses a missing row", () => {
  assert.throws(() => encodeEavtRow({}), /row is required/u);
});

test("refuses a row that is not exactly {e,a,v,t}", () => {
  assert.throws(() => encodeEavtRow({ row: { e: "thing:pebble", a: "named", v: "pebble" } }), TypeError);
});
```
## Examples
```json name="encodes a named row"
{"input":{"row":{"e":"thing:pebble","a":"named","v":"pebble","t":1}},"output":{"line":"pGFhZW5hbWVkYWVsdGhpbmc6cGViYmxlYXQBYXZmcGViYmxl"}}
```
## Traceability
- `row-to-on-disk-line` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-8949-cbor`
- `composes-eavt-encode-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-row-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-encoder` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
