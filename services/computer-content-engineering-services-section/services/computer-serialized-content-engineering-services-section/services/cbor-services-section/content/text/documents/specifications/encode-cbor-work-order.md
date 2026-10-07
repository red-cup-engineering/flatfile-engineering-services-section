# encode-cbor
## Requirements
- `value-to-base64-cbor`: The operation returns `{base64}`, where `base64` is the base64 encoding of the RFC 8949 core-deterministic ("canonical") CBOR byte string for the admitted carrier value `value`.
- `composes-cbor-codec-service`: The operation delegates the whole canonical CBOR encoding to `@red-cup-engineering/cbor-codec-service`'s own `encodeCanonical` export; it never re-derives major-type dispatch, argument shortest-form, or map-key sorting itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `value` field of its request.
## Prohibitions
- `missing-value-refusal`: The operation must refuse (throw `TypeError`) a request whose `value` field is absent (`undefined` at the top level, distinct from a request carrying a JSON `null` value).
- `no-second-encoder`: The operation must not implement CBOR major-type encoding, argument-length selection, or map-key sorting itself, nor call any canonical CBOR encoder other than `@red-cup-engineering/cbor-codec-service`'s own `encodeCanonical`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own encoding step. | Canonical CBOR encoding lives once, in `@red-cup-engineering/cbor-codec-service`; this operation composes that export by exact pin rather than reimplementing it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `rfc-8949-cbor-core-deterministic` | IETF | RFC 8949, December 2020 | https://www.rfc-editor.org/rfc/rfc8949 | Applies to the byte string this operation's `base64` field carries. | The operation's output is exactly the base64 of the core-deterministic CBOR encoding `@red-cup-engineering/cbor-codec-service` produces for `value`; it neither widens nor narrows that profile.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/encode-cbor-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/cbor-codec-service":"0.0.3"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/encode-cbor.mjs
#!/usr/bin/env node
import { encodeCanonical } from "@red-cup-engineering/cbor-codec-service";

/**
 * Encodes an admitted carrier value as base64 RFC 8949 core-deterministic ("canonical") CBOR, composing @red-cup-engineering/cbor-codec-service's own `encodeCanonical` for the whole judgment and encoding.
 * @param {object} request A record with `value` (the carrier value to encode: a boolean, null, safe-integer number, bigint, string, byte string, array, or plain object, recursively).
 * @returns {object} `{base64}` — the base64 encoding of the canonical CBOR byte string for `value`.
 * @throws {TypeError} When request.value is undefined, or when request.value is not a carrier value @red-cup-engineering/cbor-codec-service admits.
 */
export function encodeCbor(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { base64: encodeCanonical(request.value).toString("base64") };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "encodeCbor — Encodes an admitted carrier value as base64 RFC 8949 core-deterministic (\"canonical\") CBOR, composing @red-cup-engineering/cbor-codec-service's own `encodeCanonical` for the whole judgment and encoding.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(encodeCbor(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/encode-cbor.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { encodeCbor } from "../scripts/encode-cbor.mjs";

test("encodes an object to base64 canonical CBOR", () => {
  const result = encodeCbor({ value: { a: 1, b: [true, null, "x"] } });
  assert.deepEqual(result, { base64: "omFhAWFig/X2YXg=" });
});

test("encodes a scalar", () => {
  assert.deepEqual(encodeCbor({ value: 42 }), { base64: "GCo=" });
});

test("refuses a request with no value field", () => {
  assert.throws(() => encodeCbor({}), /value is required/u);
});

test("refuses a value the codec does not admit, delegating the refusal to cbor-codec-service", () => {
  assert.throws(() => encodeCbor({ value: 1.5 }), /safe integers/u);
});
```
## Examples
```json name="encodes an object with array, boolean, and null members"
{"input":{"value":{"a":1,"b":[true,null,"x"]}},"output":{"base64":"omFhAWFig/X2YXg="}}
```
```json name="encodes a scalar"
{"input":{"value":42},"output":{"base64":"GCo="}}
```
## Traceability
- `value-to-base64-cbor` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-8949-cbor-core-deterministic`
- `composes-cbor-codec-service` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-value-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-encoder` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
