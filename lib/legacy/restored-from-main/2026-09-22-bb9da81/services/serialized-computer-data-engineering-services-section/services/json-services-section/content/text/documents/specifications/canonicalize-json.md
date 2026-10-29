# canonicalize-json
## Requirements
- `value-to-canonical-text`: The operation returns `{text}`, where `text` is the JSON Canonicalization Scheme (RFC 8785) byte string for the admitted JSON value `value`.
- `composes-canonical-json-service`: The operation delegates the whole canonicalization judgment and encoding to `@red-cup-engineering/canonical-json-service`'s own `canonicalJson` export; it never re-derives JSON-value membership, key sorting, or number/string encoding itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `value` field of its request.
## Prohibitions
- `missing-value-refusal`: The operation must refuse (throw `TypeError`) a request whose `value` field is absent (`undefined` at the top level, distinct from a request carrying a JSON `null` value).
- `no-second-canonicalizer`: The operation must not implement JSON-value membership witnessing, object-key sorting, or canonical number/string encoding itself, nor call any canonicalizer other than `@red-cup-engineering/canonical-json-service`'s own `canonicalJson`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own canonicalization step. | Canonical JSON encoding lives once, in `@red-cup-engineering/canonical-json-service`; this operation composes that export by exact pin rather than reimplementing it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `rfc-8785-json-canonicalization-scheme` | IETF | RFC 8785, June 2020 | https://www.rfc-editor.org/rfc/rfc8785 | Applies to the byte string this operation's `text` field reports. | The operation's output is exactly the JCS byte string `@red-cup-engineering/canonical-json-service` produces for an admitted JSON value; it neither widens nor narrows that profile.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/canonicalize-json-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/canonical-json-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/canonicalize-json.mjs
#!/usr/bin/env node
import { canonicalJson } from "@red-cup-engineering/canonical-json-service";

/**
 * Canonicalizes an admitted JSON value to its RFC 8785 (JSON Canonicalization Scheme) byte string, composing @red-cup-engineering/canonical-json-service's own `canonicalJson` for the whole judgment and encoding.
 * @param {object} request A record with `value` (the JSON value to canonicalize).
 * @returns {object} `{text}` — the RFC 8785 canonical byte string for `value`.
 * @throws {TypeError} When request.value is undefined, or when request.value is not an admitted JSON value.
 */
export function canonicalizeJson(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { text: canonicalJson(request.value) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "canonicalizeJson — Canonicalizes an admitted JSON value to its RFC 8785 (JSON Canonicalization Scheme) byte string, composing @red-cup-engineering/canonical-json-service's own `canonicalJson` for the whole judgment and encoding.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(canonicalizeJson(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/canonicalize-json.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeJson } from "../scripts/canonicalize-json.mjs";

test("canonicalizes an object to sorted-key RFC 8785 text", () => {
  assert.deepEqual(canonicalizeJson({ value: { b: 2, a: 1 } }), { text: '{"a":1,"b":2}' });
});

test("canonicalizes a JSON scalar", () => {
  assert.deepEqual(canonicalizeJson({ value: 42 }), { text: "42" });
});

test("canonicalizes an explicit null value", () => {
  assert.deepEqual(canonicalizeJson({ value: null }), { text: "null" });
});

test("refuses a request with no value field", () => {
  assert.throws(() => canonicalizeJson({}), /value is required/u);
});

test("refuses a non-JSON value, delegating the refusal to canonical-json-service", () => {
  assert.throws(() => canonicalizeJson({ value: undefined && 1, }), TypeError);
});
```
## Examples
```json name="canonicalizes an object with unsorted keys"
{"input":{"value":{"b":2,"a":1}},"output":{"text":"{\"a\":1,\"b\":2}"}}
```
```json name="canonicalizes a scalar"
{"input":{"value":42},"output":{"text":"42"}}
```
## Traceability
- `value-to-canonical-text` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-8785-json-canonicalization-scheme`
- `composes-canonical-json-service` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-value-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-canonicalizer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
