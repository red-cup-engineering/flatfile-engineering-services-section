import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { bundleMarkdownVaultCarriers } from "../src/bundle-markdown-vault-carriers.mjs";

async function buildFixture(root) {
  const dirs = [
    "content/text/glossary/terms",
    "content/text/glossary/topics",
    "content/text/glossary/concepts",
    "content/text/documents/articles/notes",
    "services/zzz-services-section/content/text/documents/articles",
    "services/aaa-services-section/content/text/documents/articles",
  ];
  for (const dir of dirs) await mkdir(join(root, dir), { recursive: true });
  await writeFile(join(root, "content/text/glossary/terms/b-term.md"), "---\nname: B Term\n---\nB term body.\n");
  await writeFile(join(root, "content/text/glossary/terms/a-term.md"), "---\nname: A Term\n---\nA term body.\n");
  await writeFile(join(root, "content/text/glossary/topics/topic.md"), "---\nname: Topic\n---\nTopic body.\n");
  await writeFile(join(root, "content/text/glossary/concepts/concept.md"), "---\nname: Concept\n---\nConcept body.\n");
  await writeFile(join(root, "content/text/documents/articles/notes/root-note.md"), "---\ntitle: Root Note\n---\nRoot note body.\n");
  await writeFile(join(root, "services/zzz-services-section/content/text/documents/articles/note.md"), "---\ntitle: ZZZ Note\n---\nZZZ body.\n");
  await writeFile(join(root, "services/aaa-services-section/content/text/documents/articles/note.md"), "---\ntitle: AAA Note\n---\nAAA body.\n");
}

test("groups deterministically: glossary roles first, then articles by owning subsection, root articles before nested", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-corpus-"));
  try {
    await buildFixture(root);
    const result = await bundleMarkdownVaultCarriers({ root, rootLabel: "fixture-section" });
    assert.equal(result.files.length, 1);
    const text = result.files[0].text;
    const headingOrder = [...text.matchAll(/^## (.+)$/gmu)].map((match) => match[1]);
    assert.deepEqual(headingOrder, [
      "Glossary Terms",
      "Glossary Topics",
      "Glossary Concepts",
      "Articles — fixture-section",
      "Articles — aaa-services-section",
      "Articles — zzz-services-section",
    ]);
    // within the Glossary Terms group, carriers are sorted by path (a-term before b-term)
    const termOrder = [...text.matchAll(/^### (.+ Term)$/gmu)].map((match) => match[1]);
    assert.deepEqual(termOrder, ["A Term", "B Term"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("manifest lists every source carrier with its bundle file and a stable digest", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-manifest-"));
  try {
    await buildFixture(root);
    const result = await bundleMarkdownVaultCarriers({ root, rootLabel: "fixture-section" });
    assert.equal(result.manifest.carriers.length, 7);
    for (const carrier of result.manifest.carriers) {
      assert.equal(typeof carrier.path, "string");
      assert.equal(carrier.bundleFile, result.files[0].filename);
      assert.match(carrier.digest, /^sha256:[0-9a-f]{64}$/u);
    }
    const paths = result.manifest.carriers.map((carrier) => carrier.path);
    assert.deepEqual(paths, [...paths].sort((left, right) => left.localeCompare(right, "en")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("splits across files once the word budget is exceeded, never splitting one carrier", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-split-"));
  try {
    await buildFixture(root);
    const result = await bundleMarkdownVaultCarriers({ root, rootLabel: "fixture-section", wordBudget: 5 });
    assert.ok(result.files.length > 1);
    const totalCarriers = result.files.reduce((sum, file) => sum + file.carrierCount, 0);
    assert.equal(totalCarriers, 7);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails loudly rather than truncating when the corpus exceeds the file cap", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-cap-"));
  try {
    await buildFixture(root);
    await assert.rejects(
      () => bundleMarkdownVaultCarriers({ root, rootLabel: "fixture-section", wordBudget: 1, maxFiles: 2 }),
      /exceeds the 2-file cap/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("produces byte-identical bundle files and manifest across repeated runs", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-repeat-"));
  try {
    await buildFixture(root);
    const first = await bundleMarkdownVaultCarriers({ root, rootLabel: "fixture-section" });
    const second = await bundleMarkdownVaultCarriers({ root, rootLabel: "fixture-section" });
    assert.deepEqual(first.files.map((file) => file.text), second.files.map((file) => file.text));
    assert.deepEqual(first.manifest, second.manifest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a carrier with unparseable frontmatter is excluded as a defect rather than aborting the run", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-bundle-defect-"));
  try {
    await buildFixture(root);
    await writeFile(
      join(root, "content/text/glossary/terms/broken.md"),
      "---\nlist:\n  - some text before: [a|b](a|b) then more\n---\nBroken body.\n",
    );
    const result = await bundleMarkdownVaultCarriers({ root, rootLabel: "fixture-section" });
    assert.equal(result.defects.length, 1);
    assert.equal(result.defects[0].path, "content/text/glossary/terms/broken.md");
    assert.equal(result.manifest.defects.length, 1);
    assert.equal(result.manifest.carriers.some((carrier) => carrier.path === "content/text/glossary/terms/broken.md"), false);
    assert.equal(result.manifest.carriers.length, 7);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
