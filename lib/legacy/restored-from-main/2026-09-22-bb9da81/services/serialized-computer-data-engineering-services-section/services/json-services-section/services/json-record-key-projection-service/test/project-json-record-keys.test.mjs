import assert from "node:assert/strict";
import test from "node:test";
import { projectJsonRecordKeys } from "../src/project-json-record-keys.mjs";

test("projects precisely the present requested keys and preserves JSON values", () => {
  const result = projectJsonRecordKeys({
    record: { name: "example", version: "1.0.0", keywords: ["one", "two"] },
    keys: ["name", "keywords", "missing", "name"],
  });
  assert.deepEqual(result, { name: "example", keywords: ["one", "two"] });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.keywords));
});

test("refuses non-records and empty key selections", () => {
  assert.throws(() => projectJsonRecordKeys({ record: [], keys: ["name"] }), /JSON object/u);
  assert.throws(() => projectJsonRecordKeys({ record: {}, keys: [] }), /keys/u);
});
