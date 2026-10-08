# decode-cbor
## Requirements
- `base64-cbor-to-value`: The operation returns `{value}`, where `value` is the carrier value RFC 8949 core-deterministic ("canonical") CBOR bytes, given as base64, denote.
- `composes-cbor-codec-service`: The operation delegates the whole canonical-form judgment and decoding to `@red-cup-engineering/cbor-codec-service`'s own `decodeCanonical` export; it never re-derives major-type dispatch or canonical-form checking itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `base64` field of its request.
## Prohibitions
- `missing-base64-refusal`: The operation must refuse (throw `TypeError`) a request whose `base64` is not a string.
- `no-second-decoder`: The operation must not implement CBOR major-type decoding or canonical-form checking itself, nor call any canonical CBOR decoder other than `@red-cup-engineering/cbor-codec-service`'s own `decodeCanonical`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own decoding step. | Canonical CBOR decoding lives once, in `@red-cup-engineering/cbor-codec-service`; this operation composes that export by exact pin rather than reimplementing it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `rfc-8949-cbor-core-deterministic` | IETF | RFC 8949, December 2020 | https://www.rfc-editor.org/rfc/rfc8949 | Applies to what counts as decodable input and the value this operation reports. | The operation accepts only bytes `@red-cup-engineering/cbor-codec-service` judges to already be in core-deterministic form, refusing structurally valid but non-canonical CBOR rather than silently accepting it.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/decode-cbor-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/cbor-codec-service":"0.0.3"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/decode-cbor.mjs
#!/usr/bin/env node
import { decodeCanonical } from "@red-cup-engineering/cbor-codec-service";

/**
 * Decodes base64 RFC 8949 core-deterministic ("canonical") CBOR back into its carrier value, composing @red-cup-engineering/cbor-codec-service's own `decodeCanonical` for the whole canonical-form judgment and decoding.
 * @param {object} request A record with `base64` (the base64 encoding of the canonical CBOR byte string to decode).
 * @returns {object} `{value}` — the carrier value the CBOR bytes denote.
 * @throws {TypeError} When request.base64 is not a string.
 * @throws {Error} When the decoded bytes are structurally valid CBOR but not in RFC 8949 core-deterministic form, delegated from @red-cup-engineering/cbor-codec-service's own `decodeCanonical`.
 */
export function decodeCbor(request) {
  if (typeof request?.base64 !== "string") throw new TypeError("base64 must be a string");
  return { value: decodeCanonical(Buffer.from(request.base64, "base64")) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "decodeCbor — Decodes base64 RFC 8949 core-deterministic (\"canonical\") CBOR back into its carrier value, composing @red-cup-engineering/cbor-codec-service's own `decodeCanonical` for the whole canonical-form judgment and decoding.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(decodeCbor(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/decode-cbor.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { decodeCbor } from "../scripts/decode-cbor.mjs";

test("decodes base64 canonical CBOR to an object", () => {
  const result = decodeCbor({ base64: "omFhAWFig/X2YXg=" });
  assert.deepEqual(result, { value: { a: 1, b: [true, null, "x"] } });
});

test("decodes a scalar", () => {
  assert.deepEqual(decodeCbor({ base64: "GCo=" }), { value: 42 });
});

test("refuses a non-string base64", () => {
  assert.throws(() => decodeCbor({ base64: 42 }), /base64 must be a string/u);
});

test("refuses structurally valid but non-canonical CBOR, delegating the refusal to cbor-codec-service", () => {
  assert.throws(() => decodeCbor({ base64: Buffer.from([0x18, 0x00]).toString("base64") }), /deterministic/u);
});
```
## Examples
```json name="decodes an object with array, boolean, and null members"
{"input":{"base64":"omFhAWFig/X2YXg="},"output":{"value":{"a":1,"b":[true,null,"x"]}}}
```
```json name="decodes a scalar"
{"input":{"base64":"GCo="},"output":{"value":42}}
```
## Traceability
- `base64-cbor-to-value` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-8949-cbor-core-deterministic`
- `composes-cbor-codec-service` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-base64-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-decoder` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
