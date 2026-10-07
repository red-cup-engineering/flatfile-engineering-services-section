import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { mutateMarkdownFrontmatter, runMutateMarkdownFrontmatter } from "../src/mutate-markdown-frontmatter.mjs";
import { writeMarkdownFile } from "../src/write-markdown-file.mjs";
import { relocateMarkdownFrontmatterKey, runRelocateMarkdownFrontmatterKey } from "../src/relocate-markdown-frontmatter-key.mjs";

test("deletes only the named frontmatter key", () => {
  const input = "---\ntitle: Example\nauthors:\n  - [emsenn](emsenn)\ndate-created: 2026-03-04\ntags: [one]\n---\nBody.\n";
  const result = mutateMarkdownFrontmatter(input, { mode: "delete", keys: ["date-created"] });
  assert.equal(result, "---\ntitle: Example\nauthors:\n  - [emsenn](emsenn)\ntags: [one]\n---\nBody.\n");
});

test("deletes selected YAML keys without parsing or changing malformed unrelated bytes", () => {
  const input = "---\r\nslug: example\r\n# exact comment\r\nbroken: [one\r\nrelated:\r\n  - other\r\nname: Example\r\n---\r\nBody.\r\n";
  const result = mutateMarkdownFrontmatter(input, { mode: "delete", keys: ["slug", "related"] });
  assert.equal(result, "---\r\n# exact comment\r\nbroken: [one\r\nname: Example\r\n---\r\nBody.\r\n");
});

test("renames title to name by changing only the YAML key token", () => {
  const input = "---\ntitle: Model # preserve\nbroken: [one\nkeywords: [model]\n---\nBody.\n";
  const result = mutateMarkdownFrontmatter(input, { mode: "rename", from: "title", to: "name", filenameStem: "model" });
  assert.equal(result, "---\nname: Model # preserve\nbroken: [one\nkeywords: [model]\n---\nBody.\n");
});

test("term rename resolves only the admitted filename-stem collision", () => {
  const input = "---\nname: model\ntitle: Model\nkeywords: [model]\n---\nBody.\n";
  const result = mutateMarkdownFrontmatter(input, { mode: "rename", from: "title", to: "name", filenameStem: "model" });
  assert.equal(result, "---\nname: Model\nkeywords: [model]\n---\nBody.\n");
});

test("term rename resolves an equal title only when the current name is the filename stem", () => {
  const input = "---\nname: model\ntitle: model\n---\nBody.\n";
  assert.equal(
    mutateMarkdownFrontmatter(input, { mode: "rename", from: "title", to: "name", filenameStem: "model" }),
    "---\nname: model\n---\nBody.\n",
  );
});

test("term rename refuses non-filename, empty-title, and nested collisions", () => {
  assert.throws(
    () => mutateMarkdownFrontmatter("---\nname: Other\ntitle: Model\n---\n", { mode: "rename", from: "title", to: "name", filenameStem: "model" }),
    /already exists/u,
  );
  assert.throws(
    () => mutateMarkdownFrontmatter("---\nname: model\ntitle: ''\n---\n", { mode: "rename", from: "title", to: "name", filenameStem: "model" }),
    /already exists/u,
  );
  assert.throws(
    () => mutateMarkdownFrontmatter("---\ntitle: Model\nmalformed: [one\nnested:\n  title: Other\n---\n", { mode: "rename", from: "title", to: "name", filenameStem: "model" }),
    /nested key title/u,
  );
});

test("sets one YAML field while preserving every byte outside its span", () => {
  const input = "---\nname: old # replaced span\n# exact\nbroken: [one\n---\nBody.\n";
  const result = mutateMarkdownFrontmatter(input, { mode: "set", key: "name", value: "new" });
  assert.equal(result, "---\nname: new\n# exact\nbroken: [one\n---\nBody.\n");
});

test("CLI reads and atomically replaces Markdown through upstream file services", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mutate-frontmatter-"));
  const path = join(directory, "example.md");
  await writeFile(path, "---\ntitle: Example\ndate-created: 2026-03-04\n---\nBody.\n");
  const output = [];
  try {
    await runMutateMarkdownFrontmatter(["--delete", "date-created", "--", path], writeMarkdownFile, { stdout: { write: (text) => output.push(text) } });
    assert.equal(await readFile(path, "utf8"), "---\ntitle: Example\n---\nBody.\n");
    assert.equal(JSON.parse(output.join(""))[0].changed, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CLI derives filename stem for the admitted title-to-name collision", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mutate-frontmatter-rename-"));
  const path = join(directory, "model.md");
  await writeFile(path, "---\nname: model\ntitle: Model\nrelated: [other]\n---\nBody.\n");
  const output = [];
  try {
    await runMutateMarkdownFrontmatter(["--delete", "related", "--rename", "title=name", "--", path], writeMarkdownFile, { stdout: { write: (text) => output.push(text) } });
    assert.equal(await readFile(path, "utf8"), "---\nname: Model\n---\nBody.\n");
    assert.equal(JSON.parse(output.join(""))[0].changed, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test("YAML merge preserves envelope, body, comments, and scalar quoting", () => {
  const source = '\uFEFF--- \r\n# header\r\ntype: \'research-note\' # genre\r\nkept: "false"\r\n--- \r\nBody  \r\n';
  assert.equal(mutateMarkdownFrontmatter(source, { mode: 'merge', patch: { type: 'note' } }), source.replace("'research-note'", "'note'"));
});

test("TOML deletion uses mapping semantics and preserves exact body and fence", () => {
  const source = '\uFEFF+++ \r\ntitle = "Test"\r\nremove = "gone"\r\n[nested]\r\nremove = "retained"\r\n+++ \r\nBody  \r\n';
  const output = mutateMarkdownFrontmatter(source, { mode: 'delete', keys: ['remove'] });
  assert.ok(output.startsWith('\uFEFF+++ \r\n'));
  assert.ok(output.endsWith('+++ \r\nBody  \r\n'));
  assert.equal(output.includes('gone'), false);
  assert.ok(output.includes('retained'));
});

test("set adds fields to missing or empty frontmatter and honors format overrides", () => {
  assert.equal(mutateMarkdownFrontmatter('Body\r\n', { mode: 'set', key: 'title', value: 'Test' }), '---\ntitle: Test\n---\nBody\r\n');
  assert.equal(mutateMarkdownFrontmatter('---\n---\nBody\r\n', { mode: 'set', key: 'title', value: 'Test' }), '---\ntitle: Test\n---\nBody\r\n');
  assert.ok(mutateMarkdownFrontmatter('---\na: 1\n---\nBody\r\n', { mode: 'delete', keys: ['a'], format: 'toml' }).endsWith('Body\r\n'));
});

test("relocates a nested YAML frontmatter key without changing unrelated source bytes", () => {
  const source = "---\n# retained\nname: Example\nprovenance:\n  date-created: 2026-03-29\n  producer: import\nrelations:\n  enables: agent\n---\nBody.\n";
  const output = relocateMarkdownFrontmatterKey(source, { from: ["provenance", "date-created"], to: ["date-created"], beforeKey: "provenance" });
  assert.equal(output, "---\n# retained\nname: Example\ndate-created: 2026-03-29\nprovenance:\n  producer: import\nrelations:\n  enables: agent\n---\nBody.\n");
});

test("relocation removes empty source mappings, preserves matching destinations, and refuses conflicts", () => {
  assert.equal(
    relocateMarkdownFrontmatterKey("---\nprovenance:\n  date-created: 2026-03-29\n---\nBody\n", { from: ["provenance", "date-created"], to: ["date-created"] }),
    "---\ndate-created: 2026-03-29\n---\nBody\n",
  );
  assert.equal(
    relocateMarkdownFrontmatterKey("---\ndate-created: 2026-03-29\nprovenance:\n  date-created: 2026-03-29\n---\n", { from: ["provenance", "date-created"], to: ["date-created"] }),
    "---\ndate-created: 2026-03-29\n---\n",
  );
  assert.throws(
    () => relocateMarkdownFrontmatterKey("---\ndate-created: 2026-03-28\nprovenance:\n  date-created: 2026-03-29\n---\n", { from: ["provenance", "date-created"], to: ["date-created"] }),
    /different value/u,
  );
  assert.equal(
    relocateMarkdownFrontmatterKey("---\ndate-created: 2026-03-28\nprovenance:\n  date-created: 2026-03-29\n---\n", { from: ["provenance", "date-created"], to: ["date-created"], overwrite: true }),
    "---\ndate-created: 2026-03-29\n---\n",
  );
});

test("relocation CLI accepts JSON Pointer key paths", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relocate-frontmatter-"));
  const path = join(directory, "example.md");
  const output = [];
  try {
    await writeFile(path, "---\nprovenance:\n  date-created: 2026-03-29\n---\nBody\n");
    await runRelocateMarkdownFrontmatterKey(["--move", "/provenance/date-created=/date-created", "--", path], writeMarkdownFile, { stdout: { write: (text) => output.push(text) } });
    assert.equal(await readFile(path, "utf8"), "---\ndate-created: 2026-03-29\n---\nBody\n");
    assert.equal(JSON.parse(output.join(""))[0].changed, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
