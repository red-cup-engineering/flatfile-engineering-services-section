import assert from "node:assert/strict";
import test from "node:test";

import { parseCommaSeparatedTextList } from "../src/parse-comma-separated-text-list.mjs";

test("parses, trims, and preserves ordered text values", () => {
  const values = parseCommaSeparatedTextList("name, description,keywords");
  assert.deepEqual(values, ["name", "description", "keywords"]);
  assert.equal(Object.isFrozen(values), true);
});

test("refuses empty list members", () => {
  assert.throws(() => parseCommaSeparatedTextList("name,,keywords"), /values must be nonempty/u);
});
