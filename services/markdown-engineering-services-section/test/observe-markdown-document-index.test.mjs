import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { observeMarkdownDocumentIndex } from "../src/observe-markdown-document-index.mjs";

test("indexes only admitted readable Markdown paths with document features", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-index-"));
  try {
    await writeFile(join(root, "a.md"), "---\ntitle: A\n---\n# Heading\n[[B]]\n");
    await writeFile(join(root, "ignored.txt"), "# Not Markdown\n");
    await writeFile(join(root, "malformed.md"), "---\nbad: [unclosed\n---\n# Retained\n");
    const index = await observeMarkdownDocumentIndex({ root, paths: ["a.md", "ignored.txt", "malformed.md", "missing.md"] });
    assert.equal(index.length, 2);
    assert.equal(index[0].path, "a.md");
    assert.equal(index[0].headings[0].title, "Heading");
    assert.equal(index[0].features[0].type, "wikilink");
    assert.equal(index[1].frontmatter, null);
    assert.equal(index[1].headings[0].title, "Retained");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
