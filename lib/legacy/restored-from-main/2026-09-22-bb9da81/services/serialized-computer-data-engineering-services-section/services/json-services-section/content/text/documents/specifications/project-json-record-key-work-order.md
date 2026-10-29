# project-json-record-key
## Requirements
- `projects-requested-keys-only`: The operation returns a JSON object carrying exactly the keys of `keys` that are present as own properties of `record`, with `record`'s own values for those keys, and no other key.
- `composes-json-record-key-projection`: The operation delegates the whole projection to `@red-cup-engineering/json-record-key-projection-service`'s own `projectJsonRecordKeys`; it never re-derives key membership or copies values itself.
- `pure-operation`: The operation performs no filesystem or network access; it reads only the `record` and `keys` fields of its request.
## Prohibitions
- `no-second-projector`: The operation must not filter `record`'s own keys itself, nor otherwise duplicate key-set projection that `@red-cup-engineering/json-record-key-projection-service` already owns.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own projection step. | JSON record key projection lives once, in `@red-cup-engineering/json-record-key-projection-service`; this operation composes that export by exact pin rather than reimplementing it.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/project-json-record-key-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/json-record-key-projection-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/project-json-record-key.mjs
#!/usr/bin/env node
import { projectJsonRecordKeys } from "@red-cup-engineering/json-record-key-projection-service";

/**
 * Projects a JSON record onto an explicit finite set of top-level keys, composing @red-cup-engineering/json-record-key-projection-service's own `projectJsonRecordKeys`; never reimplements key projection.
 * @param {object} request A record with `record` (the JSON object to project) and `keys` (a nonempty array of nonempty key strings to keep).
 * @returns {object} The projected JSON object: an ordinary object carrying only the requested keys present on `record`, with their values from `record`.
 * @throws {TypeError} When record is not a JSON object, or keys is not a nonempty array of nonempty strings.
 */
export function projectJsonRecordKey(request) {
  return projectJsonRecordKeys({ record: request?.record, keys: request?.keys });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "projectJsonRecordKey — Projects a JSON record onto an explicit finite set of top-level keys, composing @red-cup-engineering/json-record-key-projection-service's own `projectJsonRecordKeys`; never reimplements key projection.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(projectJsonRecordKey(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/project-json-record-key.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { projectJsonRecordKey } from "../scripts/project-json-record-key.mjs";

test("projects only the requested keys present on the record", () => {
  const result = projectJsonRecordKey({ record: { a: 1, b: 2, c: 3 }, keys: ["a", "c"] });
  assert.deepEqual(result, { a: 1, c: 3 });
});

test("drops a requested key absent from the record", () => {
  const result = projectJsonRecordKey({ record: { a: 1 }, keys: ["a", "missing"] });
  assert.deepEqual(result, { a: 1 });
});

test("refuses a non-object record", () => {
  assert.throws(() => projectJsonRecordKey({ record: null, keys: ["a"] }), /record must be a JSON object/u);
});

test("refuses an empty keys array", () => {
  assert.throws(() => projectJsonRecordKey({ record: {}, keys: [] }), /keys must be a nonempty array/u);
});
```
## Examples
```json name="projects two of three keys"
{"input":{"record":{"a":1,"b":2,"c":3},"keys":["a","c"]},"output":{"a":1,"c":3}}
```
## Traceability
- `projects-requested-keys-only` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `composes-json-record-key-projection` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-projector` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
