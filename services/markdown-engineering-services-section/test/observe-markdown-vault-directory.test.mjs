import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { observeMarkdownVaultDirectory } from "../src/observe-markdown-vault-directory.mjs";

test("admits deterministic Markdown carriers with explicit policy and excludes symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-directory-"));
  const outside = await mkdtemp(join(tmpdir(), "markdown-vault-outside-"));
  try {
    await mkdir(join(root, "vault", "nested"), { recursive: true });
    await mkdir(join(root, "vault", ".git"));
    await writeFile(join(root, "vault", "b.markdown"), "# B\n");
    await writeFile(join(root, "vault", "nested", "a.md"), "# A\n");
    await writeFile(join(root, "vault", "nested", "no.txt"), "No\n");
    await writeFile(join(root, "vault", ".git", "ignored.md"), "No\n");
    await symlink(outside, join(root, "vault", "linked"));
    await writeFile(join(outside, "external.md"), "# Outside\n");
    await symlink(join(outside, "external.md"), join(root, "vault", "linked.md"));
    await symlink(join(outside, "missing.md"), join(root, "vault", "missing.md"));
    const observation = await observeMarkdownVaultDirectory({ root, region: "vault" });
    assert.deepEqual(observation.paths, ["vault/b.markdown", "vault/nested/a.md"]);
    assert.equal(observation.symlinkPolicy, "exclude");
    assert.equal(observation.excluded, 0);
    assert.equal(observation.truncated, false);
    assert.equal(observation.scanned, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("limit and maxScan are reported as distinct bounds", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bounds-"));
  try {
    await writeFile(join(root, "a.md"), "A\n");
    await writeFile(join(root, "b.md"), "B\n");
    assert.equal((await observeMarkdownVaultDirectory({ root, limit: 1 })).truncated, true);
    const scanBound = await observeMarkdownVaultDirectory({ root, maxScan: 1, limit: 10 });
    assert.equal(scanBound.scanned, 1);
    assert.equal(scanBound.truncated, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("non-Markdown files do not exhaust the content observation budget", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-content-budget-"));
  try {
    await Promise.all(Array.from({length: 20}, (_, i) => writeFile(join(root, `a-${i}.js`), "export const value = 1;")));
    await writeFile(join(root, "z.md"), "Visible source");
    const observation = await observeMarkdownVaultDirectory({ root, maxScan: 1 });
    assert.deepEqual(observation.paths, ["z.md"]);
    assert.equal(observation.scanned, 1);
    assert.equal(observation.truncated, false);
  } finally { await rm(root, {recursive: true, force: true}); }
});
