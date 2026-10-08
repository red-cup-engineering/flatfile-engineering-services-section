# derive-cbor-ni
## Requirements
- `value-to-ni-uri`: The operation returns `{uri}`, where `uri` is the RFC 6920 SHA-256 `ni:` URI naming the RFC 8949 core-deterministic ("canonical") CBOR encoding of the admitted carrier value `value`.
- `composes-cbor-codec-and-cbor-ni-service`: The operation delegates canonical CBOR encoding to `@red-cup-engineering/cbor-codec-service`'s own `encodeCanonical` and URI naming to `@red-cup-engineering/cbor-ni-service`'s own `canonicalCborToNiUri`; it never re-derives CBOR encoding, canonical-form checking, or `ni:` URI construction itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `value` field of its request.
## Prohibitions
- `missing-value-refusal`: The operation must refuse (throw `TypeError`) a request whose `value` field is absent (`undefined` at the top level, distinct from a request carrying a JSON `null` value).
- `no-second-encoder-or-namer`: The operation must not implement CBOR encoding, canonical-form checking, digesting, or `ni:` URI construction itself, nor call any export other than `@red-cup-engineering/cbor-codec-service`'s own `encodeCanonical` and `@red-cup-engineering/cbor-ni-service`'s own `canonicalCborToNiUri`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own encoding and naming steps. | Canonical CBOR encoding lives once, in `@red-cup-engineering/cbor-codec-service`; naming a CBOR byte string lives once, in `@red-cup-engineering/cbor-ni-service`; this operation composes both by exact pin rather than reimplementing either.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `rfc-8949-cbor-core-deterministic` | IETF | RFC 8949, December 2020 | https://www.rfc-editor.org/rfc/rfc8949 | Applies to the byte string this operation names. | The operation names exactly the core-deterministic CBOR encoding `@red-cup-engineering/cbor-codec-service` produces for `value`.
- `rfc-6920-naming-things-with-hashes` | IETF | RFC 6920, April 2013 | https://www.rfc-editor.org/rfc/rfc6920 | Applies to the `uri` field this operation reports. | The operation's output is exactly the SHA-256 `ni:` URI `@red-cup-engineering/cbor-ni-service` constructs for that CBOR byte string; it neither widens nor narrows that profile.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-cbor-ni-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/cbor-codec-service":"0.0.3","@red-cup-engineering/cbor-ni-service":"0.0.2"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-cbor-ni.mjs
#!/usr/bin/env node
import { encodeCanonical } from "@red-cup-engineering/cbor-codec-service";
import { canonicalCborToNiUri } from "@red-cup-engineering/cbor-ni-service";

/**
 * Names the RFC 8949 core-deterministic ("canonical") CBOR encoding of an admitted carrier value with its RFC 6920 SHA-256 `ni:` URI, composing @red-cup-engineering/cbor-codec-service's own `encodeCanonical` for the encoding and @red-cup-engineering/cbor-ni-service's own `canonicalCborToNiUri` for the naming; never re-derives either.
 * @param {object} request A record with `value` (the carrier value to encode and name: a boolean, null, safe-integer number, bigint, string, byte string, array, or plain object, recursively).
 * @returns {object} `{uri}` — the RFC 6920 SHA-256 `ni:` URI naming `value`'s canonical CBOR encoding.
 * @throws {TypeError} When request.value is undefined, or when request.value is not a carrier value @red-cup-engineering/cbor-codec-service admits.
 */
export function deriveCborNi(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { uri: canonicalCborToNiUri(encodeCanonical(request.value)) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "deriveCborNi — Names the RFC 8949 core-deterministic (\"canonical\") CBOR encoding of an admitted carrier value with its RFC 6920 SHA-256 `ni:` URI, composing @red-cup-engineering/cbor-codec-service's own `encodeCanonical` for the encoding and @red-cup-engineering/cbor-ni-service's own `canonicalCborToNiUri` for the naming; never re-derives either.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(deriveCborNi(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-cbor-ni.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveCborNi } from "../scripts/derive-cbor-ni.mjs";

test("names an object's canonical CBOR encoding", () => {
  const result = deriveCborNi({ value: { a: 1, b: [true, null, "x"] } });
  assert.deepEqual(result, { uri: "ni:///sha-256;Fxmiz1tMWuCPq6aYxJjA09EzcEQ36EkSv0t9SevQHws" });
});

test("names a scalar's canonical CBOR encoding", () => {
  const result = deriveCborNi({ value: 42 });
  assert.equal(typeof result.uri, "string");
  assert.match(result.uri, /^ni:\/\/\/sha-256;/u);
});

test("refuses a request with no value field", () => {
  assert.throws(() => deriveCborNi({}), /value is required/u);
});

test("refuses a value the codec does not admit, delegating the refusal to cbor-codec-service", () => {
  assert.throws(() => deriveCborNi({ value: 1.5 }), /safe integers/u);
});
```
## Examples
```json name="names an object's canonical CBOR encoding"
{"input":{"value":{"a":1,"b":[true,null,"x"]}},"output":{"uri":"ni:///sha-256;Fxmiz1tMWuCPq6aYxJjA09EzcEQ36EkSv0t9SevQHws"}}
```
## Traceability
- `value-to-ni-uri` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-8949-cbor-core-deterministic`, `rfc-6920-naming-things-with-hashes`
- `composes-cbor-codec-and-cbor-ni-service` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-value-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-encoder-or-namer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
