import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { searchMarkdownVaults } from "../src/search-markdown-vaults.mjs";

const POLICY = {
  schemaVersion: 1,
  extensions: ["md", "markdown", "mdx"],
  excludedDirectoryNames: [".git", "node_modules"],
  vaults: [
    { id: "alpha", region: "areas/alpha" },
    { id: "remainder", region: ".", fallback: true },
  ],
};

test("returns bounded line evidence with vault and generation provenance", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-search-"));
  try {
    await mkdir(join(root, "areas/alpha/lib/legacy"), { recursive: true });
    await mkdir(join(root, "areas/alpha/content/triage"), { recursive: true });
    await writeFile(join(root, "areas/alpha/current.md"), "First needle here.\nNo.\n");
    await writeFile(join(root, "areas/alpha/lib/legacy/old.md"), "Old NEEDLE.\n");
    await writeFile(join(root, "areas/alpha/content/triage/unsettled.md"), "Triage needle.\n");
    await writeFile(join(root, "README.md"), "Root needle.\n");
    const current = await searchMarkdownVaults({
      root,
      query: "needle",
      policy: POLICY,
      vaultIds: ["alpha"],
      generation: "current",
    });
    assert.equal(current.matches.length, 1);
    assert.deepEqual(current.matches[0], {
      vaultId: "alpha",
      generation: "current",
      path: "areas/alpha/current.md",
      line: 1,
      column: 7,
      text: "First needle here.",
      submatches: [{ start: 6, end: 12, text: "needle" }],
    });
    const triage = await searchMarkdownVaults({
      root,
      query: "needle",
      policy: POLICY,
      vaultIds: ["alpha"],
      generation: "triage",
    });
    assert.deepEqual(triage.matches.map(({ path }) => path), ["areas/alpha/content/triage/unsettled.md"]);
    const all = await searchMarkdownVaults({ root, query: "needle", policy: POLICY, limit: 2 });
    assert.equal(all.matches.length, 2);
    assert.equal(all.truncated, true);
    assert.equal(all.matchedDocuments, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fixed-string is the default and regular expressions are explicit", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-search-mode-"));
  try {
    await writeFile(join(root, "README.md"), "a.c abc\n");
    const literal = await searchMarkdownVaults({ root, query: "a.c", policy: POLICY });
    assert.equal(literal.matches[0].submatches[0].text, "a.c");
    const expression = await searchMarkdownVaults({ root, query: "a.c", policy: POLICY, regularExpression: true });
    assert.equal(expression.matches[0].submatches.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an admitted proof-path set narrows carrier reading", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-narrowed-search-"));
  try {
    await mkdir(join(root, "areas/alpha"), { recursive: true });
    await writeFile(join(root, "areas/alpha/admitted.md"), "needle\n");
    await writeFile(join(root, "areas/alpha/elsewhere.md"), "needle\n");
    const result = await searchMarkdownVaults({
      root,
      query: "needle",
      policy: POLICY,
      paths: ["areas/alpha/admitted.md"],
    });
    assert.deepEqual(result.matches.map(({ path }) => path), ["areas/alpha/admitted.md"]);
    assert.equal(result.options.narrowedPaths, 1);
    await assert.rejects(
      searchMarkdownVaults({ root, query: "needle", policy: POLICY, paths: ["../outside.md"] }),
      /escapes root/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stops the streaming supplier at one excess admitted result", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-stream-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const command = join(root, "supplier.mjs");
  const marker = join(root, "termination");
  const paths = [
    "elsewhere.md", "areas/alpha/lib/legacy/old.md", "areas/alpha/one.md",
    "areas/alpha/content/triage/pending.md", "areas/alpha/two.md", "areas/alpha/three.md",
  ];
  await mkdir(join(root, "areas/alpha"), { recursive: true });
  await writeFile(command, `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
const paths = ${JSON.stringify(paths)};
let sent = 0;
process.on("SIGTERM", () => { writeFileSync(${JSON.stringify(marker)}, String(sent)); process.exit(0); });
const timer = setInterval(() => {
  if (sent === paths.length) { clearInterval(timer); writeFileSync(${JSON.stringify(marker)}, "completed"); return; }
  process.stdout.write(JSON.stringify({ type: "match", data: { path: { text: paths[sent++] }, lines: { text: "needle\\n" }, line_number: 1, submatches: [] } }) + "\\n");
}, 40);
`, { mode: 0o755 });
  const result = await searchMarkdownVaults({ root, command, query: "needle", policy: POLICY, vaultIds: ["alpha"], generation: "current", limit: 1 });
  assert.deepEqual(result.matches.map(({ path }) => path), ["areas/alpha/one.md"]);
  assert.equal(result.truncated, true);
  assert.equal(await readFile(marker, "utf8"), "5", "supplier must stop after the second admitted match, before completing its stream");
});

test("an exact limit with only filtered excess matches is complete", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-filtered-cap-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "areas/alpha/lib/legacy"), { recursive: true });
  await writeFile(join(root, "areas/alpha/current.md"), "needle\n");
  await writeFile(join(root, "areas/alpha/lib/legacy/old.md"), "needle\n".repeat(30));
  const result = await searchMarkdownVaults({ root, query: "needle", policy: POLICY, generation: "current", limit: 1 });
  assert.equal(result.matches.length, 1);
  assert.equal(result.truncated, false);
});

test("document mode uses multiple literal patterns and one evidence line per carrier", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-documents-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "one.md"), "a.c first\na.c second\n");
  await writeFile(join(root, "two.md"), "OTHER pattern\n");
  await writeFile(join(root, "miss.md"), "abc\n");
  const options = { root, query: ["a.c", "other pattern"], policy: POLICY, matchMode: "document" };
  const complete = await searchMarkdownVaults({ ...options, limit: 2 });
  assert.deepEqual(complete.matches.map(({ path }) => path).sort(), ["one.md", "two.md"]);
  assert.equal(complete.matches.every(({ line }) => line === 1), true);
  assert.equal(complete.truncated, false);
  assert.equal((await searchMarkdownVaults({ ...options, limit: 1 })).truncated, true);
  await assert.rejects(searchMarkdownVaults({ root, query: "[", policy: POLICY, regularExpression: true }), /search failed/u);
});

test("document bounds span narrowed-path batches without inventing truncation", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-batches-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = Array.from({ length: 257 }, (_, index) => `${index}.md`);
  await Promise.all(paths.map((path, index) => writeFile(join(root, path), index === 0 ? "needle\n" : "other\n")));
  const options = { root, query: "needle", policy: POLICY, paths, matchMode: "document", limit: 1 };
  assert.equal((await searchMarkdownVaults(options)).truncated, false);
  await writeFile(join(root, paths[256]), "needle\n");
  const truncated = await searchMarkdownVaults(options);
  assert.equal(truncated.truncated, true);
  assert.deepEqual(truncated.matches.map(({ path }) => path), ["0.md"]);
});

test("explicit carriers cannot follow symlinks outside the admitted root", async (t) => {
  const base = await mkdtemp(join(tmpdir(), "markdown-vault-symlink-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, "root");
  await mkdir(root);
  await writeFile(join(base, "outside.md"), "needle\n");
  await symlink(join(base, "outside.md"), join(root, "alias.md"));
  await assert.rejects(searchMarkdownVaults({ root, query: "needle", policy: POLICY, paths: ["alias.md"] }), /escapes|outside/u);
});

test("preserves Unicode and newline paths and reports supplier startup failure", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-unicode-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = "café\nnotes.md";
  await writeFile(join(root, path), "préface 🪨\nSecond café 🪨\n");
  const result = await searchMarkdownVaults({ root, query: "café", policy: POLICY });
  assert.equal(result.matches[0].path, path);
  assert.equal(result.matches[0].line, 2);
  assert.equal(result.matches[0].text, "Second café 🪨");
  assert.equal(result.matches[0].submatches[0].text, "café");
  await assert.rejects(searchMarkdownVaults({ root, query: "café", policy: POLICY, command: join(root, "missing-command") }), /ENOENT/u);
});

test("overlapping narrowed paths and vault regions traverse each carrier once", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-overlap-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "areas/alpha/child"), { recursive: true });
  await writeFile(join(root, "areas/alpha/child/note.md"), "needle\n");
  const policy = { ...POLICY, vaults: [...POLICY.vaults, { id: "child", region: "areas/alpha/child" }] };
  const selected = await searchMarkdownVaults({ root, query: "needle", policy, vaultIds: ["alpha", "child"], limit: 1 });
  assert.equal(selected.matches.length, 1);
  assert.equal(selected.matches[0].vaultId, "child");
  assert.equal(selected.truncated, false);
  const paths = ["areas/alpha/child/note.md", "areas/alpha/child", "areas/alpha"];
  const narrowed = await searchMarkdownVaults({ root, query: "needle", policy, paths, limit: 1 });
  assert.equal(narrowed.options.narrowedPaths, 3);
  assert.equal(narrowed.matches.length, 1);
  assert.equal(narrowed.truncated, false);
});

test("explicit paths cannot bypass Markdown extensions or excluded directories", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-policy-paths-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "node_modules"));
  await writeFile(join(root, "node_modules/hidden.md"), "needle\n");
  await writeFile(join(root, "wrong.txt"), "needle\n");
  await writeFile(join(root, "visible.md"), "needle\n");
  const result = await searchMarkdownVaults({
    root, query: "needle", policy: POLICY, limit: 1,
    paths: ["node_modules/hidden.md", "wrong.txt", "visible.md"],
  });
  assert.deepEqual(result.matches.map(({ path }) => path), ["visible.md"]);
  assert.equal(result.truncated, false);
  const excluded = await searchMarkdownVaults({ root, query: "needle", policy: POLICY, paths: ["node_modules", "wrong.txt"] });
  assert.deepEqual(excluded.matches, []);
  assert.equal(excluded.truncated, false);
});


test("catalogue and search admit uppercase extensions without bypassing exclusions", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-vault-extension-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, ".git"));
  await writeFile(join(root, "README.MD"), "needle\n");
  await writeFile(join(root, ".git/hidden.MD"), "needle\n");
  const { enumerateMarkdownPaths, admitVaultPolicy } = await import("../src/observe-markdown-vaults.mjs");
  const { paths: inventory } = await enumerateMarkdownPaths({ root, policy: admitVaultPolicy(POLICY) });
  assert.deepEqual(inventory, ["README.MD"]);
  for (const paths of [undefined, inventory]) {
    const result = await searchMarkdownVaults({ root, query: "needle", policy: POLICY, paths });
    assert.deepEqual(result.matches.map(({ path }) => path), inventory);
  }
});
