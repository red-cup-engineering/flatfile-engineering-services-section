import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { listDirectoryEntries } from "../scripts/list-directory-entries.mjs";

test("lists one directory level deterministically with explicit exclusions and symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "directory-list-"));
  try {
    await mkdir(join(root, "sub"));
    await mkdir(join(root, ".git"));
    await writeFile(join(root, "b.md"), "b\n");
    await writeFile(join(root, "a.md"), "a\n");
    await symlink(join(root, "a.md"), join(root, "linked.md"));
    const listing = await listDirectoryEntries({ root, excludes: [".git"] });
    assert.deepEqual(listing.entries, [
      { name: "a.md", kind: "file" },
      { name: "b.md", kind: "file" },
      { name: "linked.md", kind: "symlink" },
      { name: "sub", kind: "directory" },
    ]);
    assert.equal(listing.excluded, 1);
    assert.equal(listing.path, "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
