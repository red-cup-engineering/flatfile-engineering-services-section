import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { MarkdownFileRevisionConflict, markdownFileRevision, prepareMarkdownFileText, writeMarkdownFile } from "../src/write-markdown-file.mjs";

test("creates, replaces, normalizes, and preserves carrier mode", async () => {
  // The workspace TMPDIR is a mounted Windows volume whose metadata policy
  // reports every file as 0777; use the native POSIX temporary filesystem for
  // the mode-preservation assertion.
  const root = await mkdtemp("/tmp/markdown-writer-");
  try {
    assert.equal(prepareMarkdownFileText("One wraps\nhere. Two follows.\n"), "One wraps here.\nTwo follows.\n");
    const created = await writeMarkdownFile({ root, path: "notes/example.md", text: "One wraps\nhere. Two follows.\n" });
    assert.equal(created.created, true);
    await chmod(created.path, 0o640);
    await assert.rejects(() => writeMarkdownFile({ root, path: "notes/example.md", text: "Again.\n" }), /already exists/u);
    const replaced = await writeMarkdownFile({ root, path: "notes/example.md", text: "Replacement.\n", mode: "replace" });
    assert.equal((await stat(replaced.path)).mode & 0o777, 0o640);
    assert.equal(await readFile(replaced.path, "utf8"), "Replacement.\n");
    await assert.rejects(() => writeMarkdownFile({ root, path: "../escape.md", text: "No.\n" }), /escapes/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("can preserve archival Markdown bytes during a surgical mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-writer-preserve-"));
  try {
    const text = "---\nauthors:\n  - [emsenn](emsenn)\n---\nA wrapped\nparagraph without a final linefeed.";
    const created = await writeMarkdownFile({ root, path: "archive.md", text, normalization: "preserve" });
    assert.equal(created.text, text);
    assert.equal(await readFile(created.path, "utf8"), text);
    assert.throws(() => prepareMarkdownFileText(text, "unknown"), /semantic or preserve/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses a writable Markdown address through a symlink outside root", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-writer-root-"));
  const outside = await mkdtemp(join(tmpdir(), "markdown-writer-outside-"));
  try {
    await symlink(outside, join(root, "linked"));
    await assert.rejects(() => writeMarkdownFile({ root, path: "linked/escape.md", text: "No.\n" }), /escapes/u);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("admits replacement only at the expected content revision", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-writer-revision-"));
  try {
    const created = await writeMarkdownFile({ root, path: "note.md", text: "One.\n", normalization: "preserve" });
    assert.equal(created.previousRevision, null);
    assert.equal(created.revision, markdownFileRevision("One.\n"));
    const replaced = await writeMarkdownFile({
      root,
      path: "note.md",
      text: "Two.\n",
      mode: "replace",
      normalization: "preserve",
      expectedRevision: created.revision,
    });
    assert.equal(replaced.previousRevision, created.revision);
    await assert.rejects(
      () => writeMarkdownFile({ root, path: "note.md", text: "Stale.\n", mode: "replace", expectedRevision: created.revision }),
      (error) => error instanceof MarkdownFileRevisionConflict && error.currentRevision === replaced.revision,
    );
    assert.equal(await readFile(join(root, "note.md"), "utf8"), "Two.\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
