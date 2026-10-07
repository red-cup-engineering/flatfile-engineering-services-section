# validate-json
## Requirements
- `valid-flag-and-errors`: The operation returns `{valid, errors}`, where `valid` is whether `value` satisfies `schema` and `errors` is the array of `{pointer, keyword, message}` violations found — empty exactly when `valid` is `true`.
- `optional-resolution-corpus`: When the request carries `schemas` (an array of additional JSON Schema documents), the operation builds the bounded resolution corpus those documents form and validates against it, so an internal `$ref` among the supplied documents resolves.
- `composes-json-schema-validate-instance`: The operation delegates the whole non-monotone instance judgment to `@red-cup-engineering/json-schema-services-section`'s own `validateInstance` (and `schemaCorpus` when `schemas` is supplied); it never re-evaluates a schema keyword itself.
- `pure-operation`: The operation performs no filesystem, network, or registry resolution; it reads only `value`, `schema`, and optional `schemas` from its request.
## Prohibitions
- `missing-schema-refusal`: The operation must refuse (throw `TypeError`) a request whose `schema` is `undefined`.
- `no-second-validator`: The operation must not implement JSON Schema keyword evaluation itself, nor call any validator other than `@red-cup-engineering/json-schema-services-section`'s own `validateInstance`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own validation step. | JSON Schema instance validation lives once, in `@red-cup-engineering/json-schema-services-section`; this operation composes that export by exact pin rather than reimplementing it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `json-schema-draft-2020-12` | IETF / json-schema.org | 2020-12 | https://json-schema.org/draft/2020-12/schema | Applies to the schema vocabulary this operation's validation verdict is judged against. | `@red-cup-engineering/json-schema-services-section` admits only Draft 2020-12; this operation carries that same bound forward without widening or narrowing it.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/validate-json-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/json-schema-services-section":"0.1.11"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/validate-json.mjs
#!/usr/bin/env node
import { validateInstance, schemaCorpus } from "@red-cup-engineering/json-schema-services-section";

/**
 * Validates a JSON value against a JSON Schema Draft 2020-12 document, composing @red-cup-engineering/json-schema-services-section's own `validateInstance` (and `schemaCorpus` when extra referenced schemas are supplied) for the whole non-monotone judgment; never reimplements schema evaluation.
 * @param {object} request A record with `value` (the JSON instance to check), `schema` (the JSON Schema document or boolean schema), and optional `schemas` (an array of additional schema documents, each carrying `$id`, registered into the bounded resolution corpus so an internal `$ref` naming one of them resolves).
 * @returns {object} `{valid, errors}` — `valid` is whether `value` satisfies `schema`; `errors` is the array of `{pointer, keyword, message}` violations reported, empty when `valid` is true.
 * @throws {TypeError} When request.schema is undefined.
 */
export function validateJson(request) {
  if (request?.schema === undefined) throw new TypeError("schema is required");
  const corpus = schemaCorpus(Array.isArray(request.schemas) ? request.schemas : []);
  const result = validateInstance(request.value, request.schema, corpus);
  return { valid: result.ok, errors: result.errors };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "validateJson — Validates a JSON value against a JSON Schema Draft 2020-12 document, composing @red-cup-engineering/json-schema-services-section's own `validateInstance` (and `schemaCorpus` when extra referenced schemas are supplied) for the whole non-monotone judgment; never reimplements schema evaluation.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(validateJson(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/validate-json.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { validateJson } from "../scripts/validate-json.mjs";

test("reports valid for an instance satisfying its schema", () => {
  const result = validateJson({ value: { a: 1 }, schema: { type: "object", required: ["a"] } });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("reports errors for an instance violating its schema", () => {
  const result = validateJson({ value: {}, schema: { type: "object", required: ["a"] } });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length > 0, true);
});

test("resolves an internal $ref against a supplied schemas corpus", () => {
  const other = { "$id": "urn:other", type: "string" };
  const schema = { "$ref": "urn:other" };
  const result = validateJson({ value: "x", schema, schemas: [other] });
  assert.equal(result.valid, true);
});

test("refuses a request with no schema", () => {
  assert.throws(() => validateJson({ value: 1 }), /schema is required/u);
});
```
## Examples
```json name="validates a conformant instance"
{"input":{"value":{"a":1},"schema":{"type":"object","required":["a"]}},"output":{"valid":true,"errors":[]}}
```
## Traceability
- `valid-flag-and-errors` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `json-schema-draft-2020-12`
- `optional-resolution-corpus` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `json-schema-draft-2020-12`
- `composes-json-schema-validate-instance` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-schema-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-validator` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
