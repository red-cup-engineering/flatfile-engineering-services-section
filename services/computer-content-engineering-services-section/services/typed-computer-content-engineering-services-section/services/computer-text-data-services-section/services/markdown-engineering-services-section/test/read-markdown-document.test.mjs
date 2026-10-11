import assert from "node:assert/strict";
import test from "node:test";
import { readMarkdownDocument } from "../src/read-markdown-document.mjs";
import { replaceMarkdownSection } from "../src/replace-markdown-section.mjs";

test("one source reading preserves body feature coordinates and complete-source heading coordinates", () => {
  const text = "---\r\nname: Example\r\n---\r\n# Visible\r\n`` [[hidden]] `` [a `label`](note.md)\r\n";
  const document = readMarkdownDocument(text);
  assert.equal(document.structure.headings[0].line, 4);
  assert.equal(document.features.length, 1);
  const [link] = document.features;
  assert.equal(link.label, "a `label`");
  assert.equal(document.body.replaceAll("\r\n", "\n").slice(link.span.start, link.span.end), link.span.text);
});

test("malformed metadata remains a diagnostic, with readable prose and no metadata relations", () => {
  const source = "---\nname: [broken\nrelation: '[[not-prose]]'\n---\n# Body\n[[real]]";
  assert.throws(() => readMarkdownDocument(source));
  const document = readMarkdownDocument(source, { onInvalidFrontmatter: "diagnose" });
  assert.equal(document.frontmatter, null);
  assert.equal(document.diagnostics[0].kind, "invalid-frontmatter");
  assert.deepEqual(document.features.map(({target}) => target), ["real"]);
  assert.equal(document.structure.headings[0].line, 5);
});

test("section replacement edits the real section while retaining fenced heading examples", () => {
  const source = "~~~md\n# Target\nexample\n~~~\n# Target\nold\n# After\nkept\n";
  const result = replaceMarkdownSection(source, { heading: "Target", content: "new" });
  assert.equal(result, "~~~md\n# Target\nexample\n~~~\n# Target\n\nnew\n# After\nkept\n");
});
