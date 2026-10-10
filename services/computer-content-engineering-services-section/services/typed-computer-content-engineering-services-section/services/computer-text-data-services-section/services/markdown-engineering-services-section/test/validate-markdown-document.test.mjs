import assert from "node:assert/strict";
import test from "node:test";
import { validateMarkdownDocument } from "../src/validate-markdown-document.mjs";

test("a clean document with no frontmatter is conformant", () => {
  const report = validateMarkdownDocument("body text\n");
  assert.equal(report.parseable, true);
  assert.equal(report.conformant, true);
  assert.deepEqual(report.findings, []);
});

test("flags a forbidden frontmatter key by default", () => {
  const report = validateMarkdownDocument("---\nauthor: someone\n---\nbody\n");
  assert.equal(report.conformant, false);
  assert.ok(report.findings.some((finding) => finding.rule === "forbidden-frontmatter-key"));
});

test("a custom forbiddenFrontmatterKeys list replaces the default", () => {
  const report = validateMarkdownDocument("---\nauthor: someone\n---\nbody\n", { forbiddenFrontmatterKeys: ["other"] });
  assert.ok(!report.findings.some((finding) => finding.rule === "forbidden-frontmatter-key"));
});

test("flags a title that duplicates the leading H1", () => {
  const report = validateMarkdownDocument("---\ntitle: Hello\n---\n# Hello\n\nbody\n");
  assert.ok(report.findings.some((finding) => finding.rule === "title-duplicates-h1"));
});

test("rejects non-string input", () => {
  assert.throws(() => validateMarkdownDocument(1), TypeError);
});

test("rejects a non-string-array forbiddenFrontmatterKeys", () => {
  assert.throws(() => validateMarkdownDocument("body", { forbiddenFrontmatterKeys: "author" }), TypeError);
});
