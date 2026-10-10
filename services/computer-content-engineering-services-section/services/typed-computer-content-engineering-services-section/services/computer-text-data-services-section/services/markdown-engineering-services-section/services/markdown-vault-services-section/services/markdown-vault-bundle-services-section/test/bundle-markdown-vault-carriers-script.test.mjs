import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runBundleMarkdownVaultCarriers } from "../scripts/bundle-markdown-vault-carriers.mjs";

async function buildFixture(root) {
  await mkdir(join(root, "content/text/glossary/terms"), { recursive: true });
  await writeFile(join(root, "content/text/glossary/terms/a.md"), "---\nname: A\n---\nBody A.\n");
}

test("writes bundle files and manifest.json to output, and records a run receipt", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-script-root-"));
  const output = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-script-output-"));
  const journalRoot = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-script-journal-"));
  try {
    await buildFixture(root);
    const result = await runBundleMarkdownVaultCarriers({ root, output, journalRoot, recordedAt: "2026-09-01T00:00:00.000Z" });
    const written = (await readdir(output)).sort();
    assert.ok(written.includes("manifest.json"));
    assert.equal(written.length, result.manifest.files.length + 1);
    const manifestOnDisk = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
    assert.deepEqual(manifestOnDisk, result.manifest);
    assert.equal(result.receipt.objectKind, "markdown-vault-bundle.run-record");
    assert.equal(result.receipt.charge.support, true);
    assert.equal(result.receipt.charge.refutation, false);
    const logPath = join(journalRoot, "data", "logs", "2026", "09", "01", "witness-journal-seavt.jsonl");
    const logged = await readFile(logPath, "utf8");
    assert.match(logged, /markdown-vault-bundle\.run/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(output, { recursive: true, force: true });
    await rm(journalRoot, { recursive: true, force: true });
  }
});

test("repeated runs to a fresh output directory are byte-identical", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-script-root-"));
  const outputA = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-script-a-"));
  const outputB = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-script-b-"));
  const journalRoot = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-script-journal-"));
  try {
    await buildFixture(root);
    await runBundleMarkdownVaultCarriers({ root, output: outputA, journalRoot, recordedAt: "2026-09-01T00:00:00.000Z" });
    await runBundleMarkdownVaultCarriers({ root, output: outputB, journalRoot, recordedAt: "2026-09-02T00:00:00.000Z" });
    const filesA = (await readdir(outputA)).sort();
    const filesB = (await readdir(outputB)).sort();
    assert.deepEqual(filesA, filesB);
    for (const filename of filesA) {
      const bytesA = await readFile(join(outputA, filename));
      const bytesB = await readFile(join(outputB, filename));
      assert.equal(createHash("sha256").update(bytesA).digest("hex"), createHash("sha256").update(bytesB).digest("hex"), filename);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outputA, { recursive: true, force: true });
    await rm(outputB, { recursive: true, force: true });
    await rm(journalRoot, { recursive: true, force: true });
  }
});

test("requires root and output", async () => {
  await assert.rejects(() => runBundleMarkdownVaultCarriers({ output: "/tmp/x" }), TypeError);
  await assert.rejects(() => runBundleMarkdownVaultCarriers({ root: "/tmp/x" }), TypeError);
});
