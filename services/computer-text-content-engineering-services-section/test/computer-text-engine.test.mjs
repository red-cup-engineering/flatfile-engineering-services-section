import assert from "node:assert/strict";
import test from "node:test";
import { mergeTextOperations, namespaceTextOperations } from "../src/computer-text-engine.mjs";

test("namespaces two domains without collision", () => {
  const read = () => 1;
  const count = () => 2;
  const operations = mergeTextOperations(
    namespaceTextOperations("markdown", { "read-markdown-features": read }),
    namespaceTextOperations("document", { "count-words": count }),
  );
  assert.deepEqual(Object.keys(operations).sort(), ["document:count-words", "markdown:read-markdown-features"]);
  assert.equal(operations["markdown:read-markdown-features"], read);
  assert.throws(() => namespaceTextOperations("", {}), TypeError);
});
