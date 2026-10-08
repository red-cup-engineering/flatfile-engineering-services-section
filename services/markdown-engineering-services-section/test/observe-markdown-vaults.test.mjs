import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  admitVaultPolicy,
  generationForPath,
  observeMarkdownVaults,
  vaultForPath,
} from "../src/observe-markdown-vaults.mjs";

const POLICY = {
  schemaVersion: 1,
  extensions: ["md", "markdown", "mdx"],
  excludedDirectoryNames: [".git", "node_modules"],
  vaults: [
    { id: "alpha", region: "areas/alpha" },
    { id: "remainder", region: ".", fallback: true },
  ],
};

test("admits one exhaustive policy and classifies by longest named region", () => {
  const policy = admitVaultPolicy(POLICY);
  assert.equal(vaultForPath("areas/alpha/note.md", policy).id, "alpha");
  assert.equal(vaultForPath("README.md", policy).id, "remainder");
  assert.equal(generationForPath("areas/alpha/lib/legacy/note.md"), "legacy");
  assert.equal(generationForPath("areas/alpha/lib/outside-projects/note.md"), "reference");
  assert.equal(generationForPath("areas/alpha/content/text/triage/note.md"), "triage");
  assert.throws(() => admitVaultPolicy({ ...POLICY, vaults: POLICY.vaults.slice(0, 1) }), /fallback/u);
});

test("observes ignored and hidden Markdown while excluding tool internals", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-catalog-"));
  try {
    await mkdir(join(root, "areas/alpha/lib/legacy"), { recursive: true });
    await mkdir(join(root, "areas/alpha/content/text/triage"), { recursive: true });
    await mkdir(join(root, ".hidden"));
    await mkdir(join(root, ".git"));
    await mkdir(join(root, "node_modules/package"), { recursive: true });
    await writeFile(join(root, ".gitignore"), ".hidden\n");
    await writeFile(join(root, "areas/alpha/current.md"), "# Current\n");
    await writeFile(join(root, "areas/alpha/lib/legacy/old.markdown"), "# Old\n");
    await writeFile(join(root, "areas/alpha/content/text/triage/unsettled.md"), "# Unsettled\n");
    await writeFile(join(root, ".hidden/ignored.mdx"), "# Still admitted\n");
    await writeFile(join(root, "README.md"), "# Root\n");
    await writeFile(join(root, ".git/internal.md"), "# Excluded\n");
    await writeFile(join(root, "node_modules/package/readme.md"), "# Excluded\n");
    const observation = await observeMarkdownVaults({ root, policy: POLICY, includePaths: true });
    assert.equal(observation.totals.documents, 5);
    assert.deepEqual(observation.totals.generations, { current: 3, legacy: 1, reference: 0, triage: 1 });
    assert.equal(observation.vaults.find(({ id }) => id === "alpha").documents, 3);
    assert.equal(observation.diagnostics.fallbackDocuments, 2);
    assert.equal(observation.diagnostics.allDocumentsAssigned, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readVaultPolicy requires an explicit path — there is no bundled default", async () => {
  const { readVaultPolicy } = await import("../src/observe-markdown-vaults.mjs");
  await assert.rejects(() => readVaultPolicy(), TypeError);
});
