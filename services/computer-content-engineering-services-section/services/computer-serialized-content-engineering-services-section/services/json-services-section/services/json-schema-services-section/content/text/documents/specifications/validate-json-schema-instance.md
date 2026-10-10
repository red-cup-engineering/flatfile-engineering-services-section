# validate-json-schema-instance
## Requirements
- `valid-flag-and-errors`: The operation returns `{valid, errors}`, where `valid` is whether `value` satisfies `schema` and `errors` is the array of `{path, keyword, message}` violations found — empty exactly when `valid` is `true`.
- `composes-validate-json-schema-service`: The operation delegates the whole instance judgment to `@red-cup-engineering/validate-json-schema-service`'s own `validateJsonSchema` export; it never re-evaluates a schema keyword itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `value` and `schema` fields of its request.
## Prohibitions
- `missing-schema-refusal`: The operation must refuse (throw `TypeError`) a request whose `schema` is `undefined`.
- `no-second-evaluator`: The operation must not implement JSON Schema keyword evaluation itself, nor call any validator other than `@red-cup-engineering/validate-json-schema-service`'s own `validateJsonSchema`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own validation step. | The bounded JSON Schema instance evaluator lives once, in `@red-cup-engineering/validate-json-schema-service`; this operation composes that export by exact pin rather than reimplementing it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/validate-json-schema-instance-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/validate-json-schema-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/validate-json-schema-instance.mjs
#!/usr/bin/env node
import { validateJsonSchema } from "@red-cup-engineering/validate-json-schema-service";

/**
 * Validates a JSON-compatible value against a JSON Schema document, composing @red-cup-engineering/validate-json-schema-service's own `validateJsonSchema` for the whole instance judgment; never reimplements schema evaluation.
 * @param {object} request A record with `value` (the JSON-compatible value to check) and `schema` (the JSON Schema document or boolean schema).
 * @returns {object} `{valid, errors}` — `valid` is whether `value` satisfies `schema`; `errors` is the array of `{path, keyword, message}` violations reported, empty when `valid` is true.
 * @throws {TypeError} When request.schema is undefined.
 */
export function validateJsonSchemaInstance(request) {
  if (request?.schema === undefined) throw new TypeError("schema is required");
  const result = validateJsonSchema(request.value, request.schema);
  return { valid: result.valid, errors: result.issues };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "validateJsonSchemaInstance — Validates a JSON-compatible value against a JSON Schema document, composing @red-cup-engineering/validate-json-schema-service's own `validateJsonSchema` for the whole instance judgment; never reimplements schema evaluation.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(validateJsonSchemaInstance(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/validate-json-schema-instance.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { validateJsonSchemaInstance } from "../scripts/validate-json-schema-instance.mjs";

test("reports valid for an instance satisfying its schema", () => {
  const result = validateJsonSchemaInstance({ value: { a: 1 }, schema: { type: "object", required: ["a"] } });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("reports errors for an instance violating its schema", () => {
  const result = validateJsonSchemaInstance({ value: {}, schema: { type: "object", required: ["a"] } });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length > 0, true);
});

test("refuses a request with no schema", () => {
  assert.throws(() => validateJsonSchemaInstance({ value: 1 }), /schema is required/u);
});
```
## Examples
```json name="validates a conformant instance"
{"input":{"value":{"a":1},"schema":{"type":"object","required":["a"]}},"output":{"valid":true,"errors":[]}}
```
## Traceability
- `valid-flag-and-errors` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `composes-validate-json-schema-service` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-schema-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-evaluator` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
