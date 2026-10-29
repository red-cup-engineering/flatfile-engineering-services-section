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
