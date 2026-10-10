import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { relocateDirectory } from "../scripts/relocate-directory.mjs";

test("relocateDirectory previews, then moves a directory without merging", async () => {
  const root = await mkdtemp(join(tmpdir(), "relocate-directory-"));
  const source = join(root, "source");
  const destination = join(root, "nested", "destination");
  try {
    await mkdir(source);
    await writeFile(join(source, "content.txt"), "preserve me\n");
    const preview = await relocateDirectory({ source, destination });
    assert.equal(preview.apply, false);
    assert.equal(await readFile(join(source, "content.txt"), "utf8"), "preserve me\n");

    const result = await relocateDirectory({ source, destination, apply: true });
    assert.equal(result.completed, true);
    assert.equal(await readFile(join(destination, "content.txt"), "utf8"), "preserve me\n");
    await assert.rejects(access(source));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
