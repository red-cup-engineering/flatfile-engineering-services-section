import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { mergeDirectoryContents, planDirectoryContentsMerge } from "../scripts/merge-directory-contents.mjs";

async function withFixture(files, run) {
  const root = await mkdtemp(join(tmpdir(), "merge-directory-contents-"));
  try {
    for (const [path, contents] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, contents);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("merges nested source contents into existing directories and removes the source", async () => {
  await withFixture({
    "source/one.md": "one\\n",
    "source/nested/two.md": "two\\n",
    "source/empty/.keep": "",
    "destination/nested/existing.md": "existing\\n",
  }, async (root) => {
    const result = await mergeDirectoryContents({ source: join(root, "source"), destination: join(root, "destination"), apply: true });
    assert.equal(result.type, "DirectoryContentsMergeResult");
    assert.equal(result.verification.complete, true);
    assert.equal(await readFile(join(root, "destination/one.md"), "utf8"), "one\\n");
    assert.equal(await readFile(join(root, "destination/nested/two.md"), "utf8"), "two\\n");
    assert.equal(await readFile(join(root, "destination/nested/existing.md"), "utf8"), "existing\\n");
    await assert.rejects(access(join(root, "source")));
  });
});

test("refuses a destination collision without writing either tree", async () => {
  await withFixture({ "source/nested/file.md": "source\\n", "destination/nested/file.md": "destination\\n" }, async (root) => {
    const source = join(root, "source");
    const destination = join(root, "destination");
    const result = await mergeDirectoryContents({ source, destination, apply: true });
    assert.equal(result.type, "DirectoryContentsMergeRefusal");
    assert.equal(result.reason, "destination-path-collision");
    assert.equal(await readFile(join(source, "nested/file.md"), "utf8"), "source\\n");
    assert.equal(await readFile(join(destination, "nested/file.md"), "utf8"), "destination\\n");
  });
});

test("surveys every entry and refuses a source symlink before any write", async () => {
  await withFixture({ "source/safe.md": "safe\\n", "destination/existing.md": "existing\\n" }, async (root) => {
    await symlink(join(root, "destination/existing.md"), join(root, "source/unsafe.md"));
    const result = await planDirectoryContentsMerge({ source: join(root, "source"), destination: join(root, "destination") });
    assert.equal(result.type, "DirectoryContentsMergeRefusal");
    assert.equal(result.reason, "source-has-unsafe-entry");
    assert.equal(await readFile(join(root, "source/safe.md"), "utf8"), "safe\\n");
  });
});
