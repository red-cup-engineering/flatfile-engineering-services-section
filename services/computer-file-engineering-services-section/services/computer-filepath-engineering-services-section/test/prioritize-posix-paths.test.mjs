import assert from "node:assert/strict";
import test from "node:test";
import { prioritizePosixPaths } from "../scripts/prioritize-posix-paths.mjs";

test("orders declared priority groups before unprioritized paths, lexically within each group", () => {
  const result = prioritizePosixPaths({
    paths: ["z.txt", "data/records/z.json", "content/z.md", "data/records/a.json", "content/a.md", "a.txt"],
    priorityPaths: ["content", "data/records"],
  });
  assert.deepEqual(result, ["content/a.md", "content/z.md", "data/records/a.json", "data/records/z.json", "a.txt", "z.txt"]);
  assert.ok(Object.isFrozen(result));
});

test("matches priority paths only at POSIX segment boundaries and preserves duplicate values", () => {
  const result = prioritizePosixPaths({
    paths: ["contents/a.md", "content", "content/a.md", "content/a.md", "contentment/a.md"],
    priorityPaths: ["content"],
  });
  assert.deepEqual(result, ["content", "content/a.md", "content/a.md", "contentment/a.md", "contents/a.md"]);
});

test("rejects malformed path values and redundant priority policy", () => {
  assert.throws(() => prioritizePosixPaths({ paths: ["/absolute"] }), /root-relative POSIX/u);
  assert.throws(() => prioritizePosixPaths({ paths: ["a\\b"] }), /normalized/u);
  assert.throws(() => prioritizePosixPaths({ paths: ["a/../b"] }), /normalized/u);
  assert.throws(() => prioritizePosixPaths({ paths: ["a"], priorityPaths: ["content", "content/docs"] }), /descendant/u);
  assert.throws(() => prioritizePosixPaths({ paths: ["a"], priorityPaths: ["content", "content"] }), /repeat/u);
});
