import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DEFAULT_MARKDOWN_VAULT_RELATION_KEYS,
  markdownVaultGlossaryScopeOf,
  resolveMarkdownVaultKeywordIndex,
  resolveMarkdownVaultKeywordIndexFromReadings,
  resolveMarkdownVaultRelationKeys,
  resolveMarkdownVaultRelationKeysForPath,
} from "../src/resolve-markdown-vault-relation-keys.mjs";

test("recognizes current and migration-era glossary locations", () => {
  assert.equal(markdownVaultGlossaryScopeOf("section/content/text/glossary/terms/composed-of.md"), "section");
  assert.equal(markdownVaultGlossaryScopeOf("legacy/content/glossary/terms/links-through.md"), "legacy");
  assert.equal(markdownVaultGlossaryScopeOf("section/content/text/documents/note.md"), null);
});

test("derives keyword back-links without materializing them on primitive terms", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-keywords-"));
  try {
    const terms = "section/content/text/glossary/terms";
    const compound = `${terms}/compound.md`;
    const model = `${terms}/model.md`;
    const articulation = `${terms}/articulation.md`;
    await mkdir(join(root, terms), { recursive: true });
    await writeFile(join(root, model), "---\nname: Model\n---\nPrimitive definition.\n");
    await writeFile(join(root, articulation), "---\nname: Articulation\n---\nPrimitive definition.\n");
    await writeFile(join(root, compound), "---\nname: Compound\nkeywords: model, articulation, absent\n---\nCompound definition.\n");
    const index = await resolveMarkdownVaultKeywordIndex({ root, paths: [model, articulation, compound] });
    assert.deepEqual(index.keywordsByPath[model], []);
    assert.deepEqual(index.keywordsByPath[compound], [
      { keyword: "model", path: model },
      { keyword: "articulation", path: articulation },
    ]);
    assert.deepEqual(index.carriersByKeywordPath[model], [compound]);
    assert.deepEqual(index.carriersByKeywordPath[articulation], [compound]);
    assert.equal(index.defects.some((defect) => defect.path === compound && defect.keyword === "absent"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the nearest glossary scope applies to its owner and descendants, never a sibling", () => {
  const entries = [
    { path: "section/content/text/glossary/terms/composed-of.md", scope: "section", relation: "composed-of" },
    { path: "section/services/child/content/text/glossary/terms/links-through.md", scope: "section/services/child", relation: "links-through" },
  ];
  const child = resolveMarkdownVaultRelationKeysForPath({ path: "section/services/child/content/text/documents/a.md", entries });
  assert.equal(child["composed-of"], "positive");
  assert.equal(child["links-through"], "positive");
  assert.equal(resolveMarkdownVaultRelationKeysForPath({ path: "section/services/other/content/text/documents/a.md", entries })["links-through"], undefined);
  assert.equal(resolveMarkdownVaultRelationKeysForPath({ path: "sibling/content/text/documents/a.md", entries })["composed-of"], undefined);
});

test("the filename is authoritative while frontmatter uses the shared parser", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-relations-"));
  try {
    const glossary = "section/content/text/glossary/terms/associated-with.md";
    await mkdir(join(root, "section/content/text/glossary/terms"), { recursive: true });
    await writeFile(join(root, glossary), "---\nslug: invented-by-metadata\nid: another-invention\n---\n# Associated with\n");
    const paths = [glossary, "section/services/child/content/text/documents/note.md"];
    const resolved = await resolveMarkdownVaultRelationKeys({ root, paths });
    assert.equal(resolved.defects.length, 0);
    assert.equal(resolved.relationsByPath[paths[1]]["associated-with"], "positive");
    assert.equal(resolved.relationsByPath[paths[1]]["invented-by-metadata"], undefined);
    assert.deepEqual(DEFAULT_MARKDOWN_VAULT_RELATION_KEYS, {});
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generic infrastructure gives every safe filename authority, including one-character names", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-relations-"));
  try {
    const terms = "section/content/text/glossary/terms";
    await mkdir(join(root, terms), { recursive: true });
    await writeFile(join(root, terms, "defines.md"), "---\nname: Defines\n---\n");
    await writeFile(join(root, terms, "related.md"), "---\nname: Related\n---\n");
    await writeFile(join(root, terms, "part-of.md"), "---\nname: Part of\n---\n");
    await writeFile(join(root, terms, "x.md"), "---\nname: X\n---\n");
    const note = "section/content/text/documents/note.md";
    const resolved = await resolveMarkdownVaultRelationKeys({
      root,
      paths: [`${terms}/defines.md`, `${terms}/related.md`, `${terms}/part-of.md`, `${terms}/x.md`, note],
    });
    assert.deepEqual(resolved.relationsByPath[note], { defines: "positive", related: "positive", "part-of": "positive", x: "positive" });
    assert.equal(resolved.relationsByPath[note]["orchestrated-by"], undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("in-memory keyword indexing derives reverse links from forward declarations", () => {
  const terms = "section/content/text/glossary/terms";
  const primitive = `${terms}/model.md`;
  const compound = `${terms}/compound.md`;
  const index = resolveMarkdownVaultKeywordIndexFromReadings({ readings: [
    { path: primitive, frontmatter: { name: "Model" } },
    { path: compound, frontmatter: { name: "Compound", keywords: "model" } },
  ] });
  assert.deepEqual(index.keywordsByPath[primitive], []);
  assert.deepEqual(index.keywordsByPath[compound], [{ keyword: "model", path: primitive }]);
  assert.deepEqual(index.carriersByKeywordPath[primitive], [compound]);
});
