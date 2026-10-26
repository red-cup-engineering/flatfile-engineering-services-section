# decode-eavt-row
## Requirements
- `line-to-row`: The operation returns `{row}`, where `row` is the `{e,a,v,t}` row decoded from `request.line` — the inverse of encode-eavt-row (base64-of-canonical-CBOR decoded back to its JSON row).
- `composes-eavt-decode-row`: The operation delegates the whole base64/canonical-CBOR decode and row-contract check to `@red-cup-engineering/eavt-services-section`'s own `decodeRow` export; it never calls a CBOR decoder or base64-to-`Buffer` conversion itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `line` field of its request.
## Prohibitions
- `missing-line-refusal`: The operation must refuse (throw an error) a request with no `line` field, or whose `line` is not a clean base64-of-canonical-CBOR-of-a-conformant-row string — a torn/partial line included.
- `no-second-decoder`: The operation must not decode base64, decode CBOR, or check row conformance itself, nor call any row-decoding export other than `@red-cup-engineering/eavt-services-section`'s own `decodeRow`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own decoding step. | The row's one on-disk decode lives once, in `@red-cup-engineering/eavt-services-section` (composing `@red-cup-engineering/cbor-codec-service` in turn); this operation composes eavt's export by exact pin rather than reimplementing any of it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `rfc-8949-cbor` | IETF | RFC 8949, December 2020 | https://www.rfc-editor.org/rfc/rfc8949 | Applies to the bytes the `line` field decodes (base64-of-canonical-CBOR). | The operation decodes exactly the RFC 8949 core-deterministic encoding `@red-cup-engineering/eavt-services-section`'s own `decodeRow` accepts; it neither widens nor narrows that profile.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/decode-eavt-row-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/eavt-services-section":"0.8.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/decode-eavt-row.mjs
#!/usr/bin/env node
import { decodeRow } from "@red-cup-engineering/eavt-services-section";

/**
 * Decodes one on-disk eavt line back to its {e,a,v,t} row, composing @red-cup-engineering/eavt-services-section's own decodeRow for the whole base64/canonical-CBOR decode and row-contract check.
 * @param {object} request A record with `line` (a base64-of-canonical-CBOR on-disk eavt line).
 * @returns {object} `{row}` — the decoded {e,a,v,t} row.
 * @throws {TypeError} When request.line is missing.
 * @throws {Error} When request.line does not decode to a clean base64-of-canonical-CBOR-of-a-conformant-row (a torn/partial line included) — the same refusal eavt's own decodeRow raises.
 */
export function decodeEavtRow(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "line")) throw new TypeError("line is required");
  return { row: decodeRow(request.line) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "decodeEavtRow — Decodes one on-disk eavt line back to its {e,a,v,t} row, composing @red-cup-engineering/eavt-services-section's own decodeRow for the whole base64/canonical-CBOR decode.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(decodeEavtRow(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/decode-eavt-row.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { decodeEavtRow } from "../scripts/decode-eavt-row.mjs";

test("decodes a base64-canonical-CBOR line back to its row", () => {
  const result = decodeEavtRow({ line: "pGFhZW5hbWVkYWVsdGhpbmc6cGViYmxlYXQBYXZmcGViYmxl" });
  assert.deepEqual(result, { row: { e: "thing:pebble", a: "named", v: "pebble", t: 1 } });
});

test("refuses a missing line", () => {
  assert.throws(() => decodeEavtRow({}), /line is required/u);
});

test("refuses a torn/malformed line", () => {
  assert.throws(() => decodeEavtRow({ line: "not-base64-cbor" }));
});
```
## Examples
```json name="decodes a named row's line"
{"input":{"line":"pGFhZW5hbWVkYWVsdGhpbmc6cGViYmxlYXQBYXZmcGViYmxl"},"output":{"row":{"e":"thing:pebble","a":"named","v":"pebble","t":1}}}
```
## Traceability
- `line-to-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-8949-cbor`
- `composes-eavt-decode-row` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-line-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-decoder` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
