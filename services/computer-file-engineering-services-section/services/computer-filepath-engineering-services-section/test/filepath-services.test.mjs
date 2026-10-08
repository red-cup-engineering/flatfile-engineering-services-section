import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { confineExistingPath, confinePath, confineWritablePath, isMarkdownPath } from "../lib/filepath.mjs";

test("lexically confines and normalizes relative addresses", () => {
  const root = join(tmpdir(), "filepath-root");
  const address = confinePath({ root, path: "notes/a.md", allowRoot: false });
  assert.equal(address.path, join(root, "notes/a.md"));
  assert.equal(address.relativePath, "notes/a.md");
  assert.throws(() => confinePath({ root, path: "../escape.md" }), /escapes/u);
});

test("real confinement refuses existing and writable paths through an escaping symlink", async () => {
  const root = await mkdtemp(join(tmpdir(), "filepath-root-"));
  const outside = await mkdtemp(join(tmpdir(), "filepath-outside-"));
  try {
    await writeFile(join(outside, "note.md"), "outside\n");
    await symlink(outside, join(root, "linked"));
    await assert.rejects(() => confineExistingPath({ root, path: "linked/note.md" }), /escapes/u);
    await assert.rejects(() => confineWritablePath({ root, path: "linked/new.md" }), /escapes/u);
    await mkdir(join(root, "notes"));
    const admitted = await confineWritablePath({ root, path: "notes/new.md" });
    assert.equal(admitted.relativePath, "notes/new.md");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("classifies Markdown paths", () => {
  assert.equal(isMarkdownPath("A.MARKDOWN"), true);
  assert.equal(isMarkdownPath("a.txt"), false);
});
