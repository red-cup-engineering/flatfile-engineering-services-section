import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fmAdd, fmRm, fmSet } from "../src/operator/edit.mjs";
import { parseFrontmatter } from "../src/substrate/flatfile.mjs";

function fixture(text) {
  const root = mkdtempSync(join(tmpdir(), "flatfile-edit-"));
  const target = "note.md";
  writeFileSync(join(root, target), text, "utf8");
  return { root, target, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("fmSet renders a scalar through the shared Markdown-engineering frontmatter writer", () => {
  const { root, target, cleanup } = fixture("---\ntitle: Example\n---\nBody.\n");
  try {
    const preview = fmSet(root, target, "title", "Renamed", { dryRun: true });
    assert.equal(preview.changed, true);
    const { fm, body } = parseFrontmatter(preview.newText);
    assert.deepEqual(fm, { title: "Renamed" });
    assert.equal(body, "Body.\n");
  } finally {
    cleanup();
  }
});

test("fmAdd renders a new list-valued key that reads back as the same list", () => {
  const { root, target, cleanup } = fixture("---\ntitle: Example\n---\nBody.\n");
  try {
    const preview = fmAdd(root, target, "tags", "alpha", { dryRun: true });
    const { fm } = parseFrontmatter(preview.newText);
    assert.deepEqual(fm, { title: "Example", tags: ["alpha"] });
  } finally {
    cleanup();
  }
});

test("fmRm of a note's last remaining key still leaves a present (empty) frontmatter fence, not none at all", () => {
  const { root, target, cleanup } = fixture("---\ntitle: Example\n---\nBody.\n");
  try {
    const preview = fmRm(root, target, "title", null, { dryRun: true });
    assert.equal(preview.newText, "---\n---\nBody.\n");
    // The round trip must still read as a flatfile (fm present, even if
    // empty) -- parseFrontmatter throws "not a flatfile" only when the
    // fence itself is absent, which fmRm must never produce.
    const { fm, body } = parseFrontmatter(preview.newText);
    assert.deepEqual(fm, {});
    assert.equal(body, "Body.\n");
  } finally {
    cleanup();
  }
});

test("fmSet quotes and re-reads scalars requiring YAML quoting (colons, leading dashes, booleans-as-strings)", () => {
  const { root, target, cleanup } = fixture("---\ntitle: Example\n---\nBody.\n");
  try {
    const preview = fmSet(root, target, "note", "a: b", { dryRun: true });
    const { fm } = parseFrontmatter(preview.newText);
    assert.equal(fm.note, "a: b");
  } finally {
    cleanup();
  }
});
