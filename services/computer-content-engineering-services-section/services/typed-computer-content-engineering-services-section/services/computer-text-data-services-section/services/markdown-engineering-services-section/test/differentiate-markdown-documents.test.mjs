import assert from "node:assert/strict";
import test from "node:test";

import { differentiateMarkdownDocuments } from "../src/differentiate-markdown-documents.mjs";

test("differentiateMarkdownDocuments detects an added heading section between two documents", () => {
  const before = "---\ntitle: Note\ntags: []\n---\n# Note\n\nSee [[Proof Path]] and [site](https://example.test).\n";
  const after = `${before}\n## Evidence\n\nA durable path.\n`;
  const diff = differentiateMarkdownDocuments(before, after);
  assert.equal(diff.changed, true);
  assert.equal(
    diff.headings.some((entry) => entry.kind === "added" && entry.signature.includes("Evidence")),
    true,
  );
});

test("legacy layered diff retains frontmatter changes and line hunks on the current owner", () => {
  const before = "---\ntitle: Before\n---\n# Note\n";
  const after = "---\ntitle: After\n---\n# Note\n\n## Evidence\n";
  const result = differentiateMarkdownDocuments(before, after, {beforeLabel: "old", afterLabel: "new", contextLines: 1});
  assert.equal(result.kind, "red-cup-engineering.markdown.document-difference");
  assert.equal(result.frontmatter.some(x => x.key === "title" && x.kind === "changed" && x.before === "Before" && x.after === "After"), true);
  assert.equal(result.headings.some(x => x.kind === "added" && x.signature.includes("Evidence")), true);
  assert.match(result.lines.unified, /^--- old\n\+\+\+ new\n@@ /u);
  assert.equal(result.lines.changed, true);
});
test("identical archived Markdown is a no-op in the current document differencer", () => {
  const note = "---\ntitle: Note\n---\n# Heading\n";
  const result = differentiateMarkdownDocuments(note, note);
  assert.equal(result.changed, false);
  assert.equal(result.lines.changed, false);
  assert.equal(result.lines.unified, "");
  assert.deepEqual(result.frontmatter, []);
  assert.deepEqual(result.headings, []);
  assert.ok(Object.isFrozen(result));
});
