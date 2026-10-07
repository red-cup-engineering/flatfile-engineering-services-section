import assert from "node:assert/strict";
import test from "node:test";

import { createMarkdownDocument } from "../src/create-markdown-document.mjs";

test("creates canonical frontmatter and a Markdown body from one view", () => {
  const document = createMarkdownDocument({
    title: "FOAM",
    authors: ["Codex@example"],
    "date-created": "2026-08-12",
    body: "A first line.\nA second line.\n"
  }, { semanticLinefeeds: false });

  assert.equal(document, [
    "---",
    "authors:",
    "  - Codex@example",
    "date-created: 2026-08-12",
    "title: FOAM",
    "---",
    "A first line.",
    "A second line.",
    ""
  ].join("\n"));
});

test("omits nullish metadata but preserves an explicit empty array", () => {
  const document = createMarkdownDocument({ title: "SEA", aliases: [], absent: null, body: "Definition.\n" });
  assert.match(document, /^---\naliases: \[\]\ntitle: SEA\n---\n/);
  assert.doesNotMatch(document, /absent/);
});
