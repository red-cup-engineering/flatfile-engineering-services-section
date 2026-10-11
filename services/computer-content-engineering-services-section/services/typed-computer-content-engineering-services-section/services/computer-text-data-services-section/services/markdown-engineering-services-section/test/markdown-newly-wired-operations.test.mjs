import assert from "node:assert/strict";
import test from "node:test";
import { invokeMarkdownService } from "../src/type/markdown.mjs";

test("read-markdown-table reads headers and header-keyed rows", async () => {
  const result = await invokeMarkdownService("read-markdown-table", {
    text: "| a | b |\n| --- | --- |\n| 1 | 2 |\n",
  });
  assert.deepEqual(result.headers, ["a", "b"]);
  assert.deepEqual(result.rows, [{ a: "1", b: "2" }]);
});

test("project-markdown-relative-link projects a ../ relative link between two repo-relative paths", async () => {
  const result = await invokeMarkdownService("project-markdown-relative-link", {
    carrierPath: "notes/a/one.md",
    targetPath: "notes/b/two.md",
  });
  assert.equal(result, "../b/two.md");
});

test("plan-markdown-tree-relocation computes the rewrites a directory move implies", async () => {
  const graph = {
    edges: [
      {
        kind: "markdown-link",
        status: "resolved",
        sourcePath: "notes/moved/a.md",
        targetPath: "notes/stays/b.md",
        target: "../stays/b.md",
      },
    ],
  };
  const plan = await invokeMarkdownService("plan-markdown-tree-relocation", { graph, sourceDir: "notes/moved", destDir: "archive" });
  assert.equal(plan.rewrites.length, 1);
  assert.equal(plan.rewrites[0].newTarget, "../notes/stays/b.md");
});

test("replace-markdown-link-target rewrites a matching link target", async () => {
  const result = await invokeMarkdownService("replace-markdown-link-target", {
    text: "[see](old.md)",
    request: { target: "old.md", replacement: "new.md" },
  });
  assert.match(result.text, /new\.md/u);
});

test("resolve-markdown-link-target and unknown-operation still refuse cleanly through the same dispatcher", async () => {
  await assert.rejects(() => invokeMarkdownService("not-a-real-operation", {}), TypeError);
});
