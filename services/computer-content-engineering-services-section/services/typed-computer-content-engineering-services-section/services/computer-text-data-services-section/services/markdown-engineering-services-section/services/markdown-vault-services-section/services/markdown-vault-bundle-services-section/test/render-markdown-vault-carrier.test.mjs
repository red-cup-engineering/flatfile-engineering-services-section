import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { renderMarkdownVaultCarrier } from "../src/render-markdown-vault-carrier.mjs";

test("renders a heading, path, description, references, and relations from frontmatter", () => {
  const markdown = [
    "---",
    "title: \"Autoimmunity\"",
    "description: \"Failure of self-tolerance.\"",
    "date-created: 2026-08-21",
    "authors:",
    "  - claude-sonnet-5",
    "keywords:",
    "  - immunology",
    "instance-of: immune-dysfunction",
    "contrasts-with: [immunological-tolerance, self-non-self]",
    "references:",
    "  smith-2020:",
    "    title: \"A Study\"",
    "    authors: [\"Smith, J.\"]",
    "    year: 2020",
    "---",
    "",
    "Body text about autoimmunity.",
    "",
  ].join("\n");
  const rendered = renderMarkdownVaultCarrier({ path: "section/content/text/glossary/terms/autoimmunity.md", markdown });
  assert.equal(rendered.name, "Autoimmunity");
  assert.equal(rendered.path, "section/content/text/glossary/terms/autoimmunity.md");
  assert.equal(rendered.digest, `sha256:${createHash("sha256").update(markdown, "utf8").digest("hex")}`);
  assert.match(rendered.text, /^### Autoimmunity\n/);
  assert.match(rendered.text, /\*Carrier: `section\/content\/text\/glossary\/terms\/autoimmunity\.md`\*/);
  assert.match(rendered.text, /\*\*Description:\*\* Failure of self-tolerance\./);
  assert.match(rendered.text, /\*\*References:\*\*\n- \*\*smith-2020\*\*: A Study — Smith, J\. — 2020/);
  assert.match(rendered.text, /\*\*Relations:\*\*\n- \*\*contrasts-with\*\*: immunological-tolerance, self-non-self\n- \*\*instance-of\*\*: immune-dysfunction/);
  assert.match(rendered.text, /Body text about autoimmunity\.\n$/);
  assert.ok(rendered.wordCount > 0);
  // metadata keys (date-created, authors, keywords) are never rendered as relations
  assert.doesNotMatch(rendered.text, /\*\*date-created\*\*/);
  assert.doesNotMatch(rendered.text, /\*\*authors\*\*/);
  assert.doesNotMatch(rendered.text, /\*\*keywords\*\*/);
});

test("falls back to the filename when frontmatter has no title or name, and tolerates absent frontmatter", () => {
  const rendered = renderMarkdownVaultCarrier({ path: "section/content/text/documents/articles/note.md", markdown: "Plain body, no frontmatter.\n" });
  assert.equal(rendered.name, "note");
  assert.match(rendered.text, /^### note\n/);
  assert.doesNotMatch(rendered.text, /\*\*Description:\*\*/);
  assert.doesNotMatch(rendered.text, /\*\*References:\*\*/);
  assert.doesNotMatch(rendered.text, /\*\*Relations:\*\*/);
  assert.match(rendered.text, /Plain body, no frontmatter\.\n$/);
});

test("prefers name over the filename when title is absent", () => {
  const markdown = "---\nname: Homeostasis\n---\nBody.\n";
  const rendered = renderMarkdownVaultCarrier({ path: "x/content/text/glossary/terms/homeostasis.md", markdown });
  assert.equal(rendered.name, "Homeostasis");
});

test("requires path and markdown", () => {
  assert.throws(() => renderMarkdownVaultCarrier({ path: "", markdown: "x" }), TypeError);
  assert.throws(() => renderMarkdownVaultCarrier({ path: "a.md", markdown: 5 }), TypeError);
});
