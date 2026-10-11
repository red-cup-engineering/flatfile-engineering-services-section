import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarkdownDocument } from "../src/normalize-markdown-document.mjs";

test("removes a redundant document H1 named by name or title", () => {
  assert.equal(
    normalizeMarkdownDocument("---\nname: Neural\n---\n# Neural\n\nDefinition.\n"),
    "---\nname: Neural\n---\nDefinition.\n",
  );
  assert.equal(
    normalizeMarkdownDocument("---\ntitle: Neural\n---\n   # Neural ###\n\nDefinition.\n"),
    "---\ntitle: Neural\n---\nDefinition.\n",
  );
});

test("preserves a nonmatching or non-document H1", () => {
  assert.match(
    normalizeMarkdownDocument("---\nname: Neural\n---\n# Other\n\nDefinition.\n"),
    /# Other/u,
  );
  assert.match(
    normalizeMarkdownDocument("---\nname: Neural\n---\nIntroduction.\n\n# Neural\n"),
    /# Neural/u,
  );
});

test("never removes an H1 from fenced code", () => {
  const markdown = "---\nname: Neural\n---\n```markdown\n# Neural\n```\n";
  assert.match(normalizeMarkdownDocument(markdown), /```markdown\n# Neural\n```/u);
});
