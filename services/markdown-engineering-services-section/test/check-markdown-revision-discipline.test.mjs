import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import {
  checkMarkdownRevisionDiscipline,
  scanMarkdownText,
} from "../scripts/check-markdown-revision-discipline.mjs";

test("passes a carrier with no annotation prose", () => {
  const text = "# Title\n\nThe service reads the file and writes it back.\n";
  assert.deepEqual(scanMarkdownText(text), []);
});

test("flags a Correction: prefix at line start", () => {
  const hits = scanMarkdownText("Correction: the count was wrong.\n");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pattern, "correction-prefix");
  assert.equal(hits[0].line, 1);
});

test("flags UPDATE and EDIT prefixes, including bulleted and bolded forms", () => {
  const text = "- **UPDATE:** revised below\n> EDIT: see above\n";
  const hits = scanMarkdownText(text);
  assert.equal(hits.length, 2);
});

test("flags strikethrough", () => {
  const hits = scanMarkdownText("The value is ~~12~~ 15.\n");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pattern, "strikethrough");
});

test("flags a dated Verified block, case-insensitively", () => {
  const hits = scanMarkdownText("Verified 2026-08-30 against the registry.\n");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pattern, "verified-block");

  const lower = scanMarkdownText("36 of 36 files matched (verified 2026-08-31).\n");
  assert.equal(lower.length, 1);
  assert.equal(lower[0].pattern, "verified-block");
});

test("flags lower-case formerly-known-as phrasing", () => {
  const hits = scanMarkdownText("this was formerly known as the old name.\n");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pattern, "formerly-provenance");
});

test("flags formerly-known-as and historical-name provenance prose", () => {
  const text =
    "The service was formerly Fizz.\nqtOps is the historical name for the mapper.\n";
  const hits = scanMarkdownText(text);
  assert.equal(hits.length, 2);
  assert.deepEqual(
    hits.map((h) => h.pattern),
    ["formerly-provenance-name", "historical-name"],
  );
});

test("flags a note-previously-said footnote", () => {
  const hits = scanMarkdownText("This note previously said the opposite.\n");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pattern, "previously-said");
});

test("does not flag a fenced code block containing banned patterns", () => {
  const text = "```\nCorrection: this is example text, not a real annotation\n~~x~~\n```\n";
  assert.deepEqual(scanMarkdownText(text), []);
});

test("does not flag a quoted mention of a banned phrase inside prose", () => {
  const text =
    'Never add "Correction:", bracketed labels, or "formerly known as" provenance prose.\n';
  assert.deepEqual(scanMarkdownText(text), []);
});

test("does not flag an inline-code-spanned example", () => {
  const text = "Do not write `Correction:` at the start of a line.\n";
  assert.deepEqual(scanMarkdownText(text), []);
});

test("checkMarkdownRevisionDiscipline scans files under a directory and reports file:line", async () => {
  const root = await mkdtemp("/tmp/check-markdown-revision-discipline-");
  try {
    await writeFile(`${root}/clean.md`, "# Clean\n\nNothing wrong here.\n");
    await writeFile(
      `${root}/dirty.md`,
      "# Dirty\n\nCorrection: this was wrong.\n",
    );
    const violations = checkMarkdownRevisionDiscipline([root]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].path, `${root}/dirty.md`);
    assert.equal(violations[0].line, 3);
    assert.equal(violations[0].pattern, "correction-prefix");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
