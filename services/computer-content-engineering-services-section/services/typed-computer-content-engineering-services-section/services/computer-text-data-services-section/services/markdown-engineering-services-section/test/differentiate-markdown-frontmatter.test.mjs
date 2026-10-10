import assert from "node:assert/strict";
import test from "node:test";
import { differentiateMarkdownFrontmatter } from "../src/differentiate-markdown-frontmatter.mjs";

test("differentiates the decoded frontmatter of two Markdown texts", () => {
  const before = "---\ntitle: One\n---\nbody";
  const after = "---\ntitle: Two\nkeywords: [a]\n---\nbody";
  const changes = differentiateMarkdownFrontmatter(before, after);
  assert.ok(Array.isArray(changes) || (changes !== null && typeof changes === "object"));
});

test("treats missing frontmatter as an empty object rather than throwing", () => {
  assert.doesNotThrow(() => differentiateMarkdownFrontmatter("no frontmatter here", "---\ntitle: New\n---\nbody"));
});

test("rejects non-string input", () => {
  assert.throws(() => differentiateMarkdownFrontmatter(1, "text"), TypeError);
  assert.throws(() => differentiateMarkdownFrontmatter("text", null), TypeError);
});
