import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  isMarkdownVaultBundleStaging,
  MARKDOWN_VAULT_BUNDLE_ROLES,
  roleOfMarkdownVaultCarrier,
  selectMarkdownVaultCarriers,
} from "../src/select-markdown-vault-carriers.mjs";

async function buildFixture(root) {
  const dirs = [
    "content/text/glossary/terms",
    "content/text/glossary/topics",
    "content/text/glossary/concepts",
    "content/text/documents/articles/notes",
    "content/text/triage",
    "lib/legacy/content/text/glossary/terms",
    "services/child-services-section/content/text/documents/articles",
    "node_modules/pkg",
  ];
  for (const dir of dirs) await mkdir(join(root, dir), { recursive: true });
  await writeFile(join(root, "content/text/glossary/terms/alpha.md"), "# Alpha\n");
  await writeFile(join(root, "content/text/glossary/terms/beta--archive-2026-01-01.md"), "# Beta archive\n");
  await writeFile(join(root, "content/text/glossary/topics/topic-one.md"), "# Topic\n");
  await writeFile(join(root, "content/text/glossary/concepts/concept-one.md"), "# Concept\n");
  await writeFile(join(root, "content/text/documents/articles/notes/root-note.md"), "# Root note\n");
  await writeFile(join(root, "content/text/triage/dropped.md"), "# Dropped\n");
  await writeFile(join(root, "lib/legacy/content/text/glossary/terms/old.md"), "# Old\n");
  await writeFile(join(root, "services/child-services-section/content/text/documents/articles/child-note.md"), "# Child note\n");
  await writeFile(join(root, "node_modules/pkg/readme.md"), "# Not a carrier\n");
  await writeFile(join(root, "content/text/documents/articles/notes/not-markdown.txt"), "Not markdown\n");
}

test("selects only admitted roles, in sorted order, excluding staging conventions", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-select-"));
  try {
    await buildFixture(root);
    const selection = await selectMarkdownVaultCarriers({ root });
    const paths = selection.carriers.map((carrier) => carrier.path);
    assert.deepEqual(paths, [
      "content/text/documents/articles/notes/root-note.md",
      "content/text/glossary/concepts/concept-one.md",
      "content/text/glossary/terms/alpha.md",
      "content/text/glossary/topics/topic-one.md",
      "services/child-services-section/content/text/documents/articles/child-note.md",
    ]);
    assert.deepEqual(selection.roles, MARKDOWN_VAULT_BUNDLE_ROLES);
    const sorted = [...paths].sort((left, right) => left.localeCompare(right, "en"));
    assert.deepEqual(paths, sorted);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("roles option narrows selection to the requested content roles", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-select-roles-"));
  try {
    await buildFixture(root);
    const selection = await selectMarkdownVaultCarriers({ root, roles: ["glossary-terms"] });
    assert.deepEqual(selection.carriers.map((carrier) => carrier.path), ["content/text/glossary/terms/alpha.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an unknown role", async () => {
  await assert.rejects(() => selectMarkdownVaultCarriers({ root: "/nonexistent", roles: ["bogus"] }), TypeError);
});

test("roleOfMarkdownVaultCarrier and isMarkdownVaultBundleStaging classify paths without a filesystem", () => {
  assert.equal(roleOfMarkdownVaultCarrier("section/content/text/glossary/terms/a.md"), "glossary-terms");
  assert.equal(roleOfMarkdownVaultCarrier("section/content/text/documents/articles/notes/a.md"), "articles");
  assert.equal(roleOfMarkdownVaultCarrier("section/content/text/documents/note.md"), null);
  assert.equal(isMarkdownVaultBundleStaging("section/lib/legacy/content/text/glossary/terms/a.md"), true);
  assert.equal(isMarkdownVaultBundleStaging("section/content/text/triage/a.md"), true);
  assert.equal(isMarkdownVaultBundleStaging("section/content/text/glossary/terms/a--archive-2026-01-01.md"), true);
  assert.equal(isMarkdownVaultBundleStaging("section/content/text/glossary/terms/a.md"), false);
});
