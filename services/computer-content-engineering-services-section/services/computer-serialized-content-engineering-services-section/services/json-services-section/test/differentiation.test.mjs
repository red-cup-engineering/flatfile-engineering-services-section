import assert from "node:assert/strict";
import test from "node:test";

import { differentiateData } from "../scripts/differentiate-data.mjs";
import { differentiateSequences } from "../scripts/differentiate-sequences.mjs";

test("reports deterministic changes between JSON values", () => {
  assert.deepEqual(differentiateData({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }), [
    { kind: "changed", path: "b", before: 2, after: 3 },
    { kind: "added", path: "c", after: 4 },
  ]);
});

test("reports an ordered sequence edit relation", () => {
  assert.deepEqual(differentiateSequences(["a", "b"], ["a", "c"]), [
    { kind: "equal", beforeIndex: 0, afterIndex: 0, value: "a" },
    { kind: "insert", afterIndex: 1, value: "c" },
    { kind: "delete", beforeIndex: 1, value: "b" },
  ]);
});
