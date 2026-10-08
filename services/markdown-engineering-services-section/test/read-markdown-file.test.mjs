import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readMarkdownFile } from "../src/read-markdown-file.mjs";

test("reads admitted Markdown extensions beneath a real-confined root", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-reader-"));
  try {
    await writeFile(join(root, "note.MARKDOWN"), "# Note\n");
    assert.equal(await readMarkdownFile({ root, path: "note.MARKDOWN" }), "# Note\n");
    await assert.rejects(() => readMarkdownFile({ root, path: "note.txt" }), /Markdown file/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses an existing Markdown carrier through a symlink outside root", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-reader-root-"));
  const outside = await mkdtemp(join(tmpdir(), "markdown-reader-outside-"));
  try {
    await writeFile(join(outside, "note.md"), "outside\n");
    await symlink(outside, join(root, "linked"));
    await assert.rejects(() => readMarkdownFile({ root, path: "linked/note.md" }), /escapes/u);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
