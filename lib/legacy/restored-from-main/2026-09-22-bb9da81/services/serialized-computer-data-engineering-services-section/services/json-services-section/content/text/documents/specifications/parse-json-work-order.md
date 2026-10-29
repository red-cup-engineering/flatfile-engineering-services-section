# parse-json
## Requirements
- `parses-valid-json-text-to-value`: On JSON text that parses, the operation returns `{ok: true, value}` where `value` is the JSON value `text` denotes.
- `refusal-carries-parse-error-position`: On JSON text that does not parse, the operation returns `{ok: false, error: {message, position}}` where `message` is the underlying parse error's message and `position` is the character offset it names, or `null` when the message names none.
- `composes-json-codec-parse`: The operation delegates the JSON.parse call and JSON-value membership witnessing to `@red-cup-engineering/json-codec-service`'s own `parse` export; it never calls `JSON.parse` itself or re-derives JSON-value membership.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `text` field of its request.
## Prohibitions
- `missing-text-refusal`: The operation must refuse (throw `TypeError`) a request whose `text` is not a string.
- `no-second-json-parser`: The operation must not call `JSON.parse` directly, nor otherwise duplicate JSON-text parsing or JSON-value membership witnessing that `@red-cup-engineering/json-codec-service` already owns.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own parsing step. | JSON text parsing and JSON-value membership witnessing live once, in `@red-cup-engineering/json-codec-service`; this operation composes that export by exact pin rather than reimplementing it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `ecma-404-json-data-interchange-format` | Ecma International | 2nd edition | https://www.ecma-international.org/publications-and-standards/standards/ecma-404/ | Applies to what counts as parseable JSON text and an admitted JSON value. | The operation's `ok: true` branch reports exactly the JSON value the ECMA-404 grammar assigns to parseable `text`; malformed text refuses rather than being coerced.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/parse-json-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/json-codec-service":"0.1.13"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/parse-json.mjs
#!/usr/bin/env node
import { parse } from "@red-cup-engineering/json-codec-service";

function positionFromMessage(message) {
  const match = /position (\d+)/u.exec(message);
  return match ? Number(match[1]) : null;
}

/**
 * Parses JSON text into an admitted JSON value, composing @red-cup-engineering/json-codec-service's own `parse` for both the JSON.parse call and JSON-value membership witnessing.
 * @param {object} request A record with `text` (the JSON document text to parse).
 * @returns {object} `{ok: true, value}` on a successful parse, or `{ok: false, error: {message, position}}` when `text` does not parse as JSON — `position` is the character offset named in the underlying error message, or `null` when the message names none.
 * @throws {TypeError} When request.text is not a string.
 */
export function parseJson(request) {
  if (typeof request?.text !== "string") throw new TypeError("text must be a string");
  try {
    return { ok: true, value: parse(request.text) };
  } catch (error) {
    return { ok: false, error: { message: error.message, position: positionFromMessage(error.message) } };
  }
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "parseJson — Parses JSON text into an admitted JSON value, composing @red-cup-engineering/json-codec-service's own `parse` for both the JSON.parse call and JSON-value membership witnessing.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(parseJson(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/parse-json.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { parseJson } from "../scripts/parse-json.mjs";

test("parses valid JSON text to a value", () => {
  assert.deepEqual(parseJson({ text: "{\"a\":1}" }), { ok: true, value: { a: 1 } });
});

test("parses a JSON scalar", () => {
  assert.deepEqual(parseJson({ text: "42" }), { ok: true, value: 42 });
});

test("refuses a missing text", () => {
  assert.throws(() => parseJson({}), /text must be a string/u);
});

test("reports a refusal with the parse error position for malformed JSON", () => {
  const result = parseJson({ text: "{bad}" });
  assert.equal(result.ok, false);
  assert.equal(typeof result.error.message, "string");
  assert.equal(result.error.position, 1);
});

test("reports a null position when the underlying message names none", () => {
  const result = parseJson({ text: "" });
  assert.equal(result.ok, false);
  assert.equal(result.error.position, null);
});
```
## Examples
```json name="parses a JSON object"
{"input":{"text":"{\"a\":1}"},"output":{"ok":true,"value":{"a":1}}}
```
```json name="refuses malformed JSON with a position"
{"input":{"text":"{bad}"},"output":{"ok":false,"error":{"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)","position":1}}}
```
## Traceability
- `parses-valid-json-text-to-value` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `ecma-404-json-data-interchange-format`
- `refusal-carries-parse-error-position` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `composes-json-codec-parse` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-text-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-json-parser` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
