import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readMarkdownCarrier } from "../src/read-markdown-carrier.mjs";

const CARRIER = [
  "---",
  "identity: sample-carrier",
  "name: sample carrier",
  "---",
  "",
  "# Sample Carrier",
  "",
  "Intro line.",
  "",
  "## First Section",
  "",
  "First section body.",
  "Second line of first section.",
  "",
  "## Second Section",
  "",
  "Second section body.",
  "",
].join("\n");

async function withFixture(fn) {
  const root = await mkdtemp(join(tmpdir(), "markdown-read-carrier-"));
  try {
    await mkdir(join(root, "areas"), { recursive: true });
    await writeFile(join(root, "areas/sample.md"), CARRIER);
    await writeFile(join(root, "areas/not-markdown.txt"), "plain text\n");
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("reads frontmatter, the heading outline, and the whole body when no section is named", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "areas/sample.md" });
    assert.equal(result.kind, "red-cup-engineering.markdown-vault.read-carrier");
    assert.equal(result.frontmatterFormat, "yaml");
    assert.deepEqual(result.frontmatter, { identity: "sample-carrier", name: "sample carrier" });
    assert.deepEqual(result.outline, [
      { title: "Sample Carrier", level: 1, line: 6 },
      { title: "First Section", level: 2, line: 10 },
      { title: "Second Section", level: 2, line: 15 },
    ]);
    assert.equal(result.section, null);
    assert.equal(result.body, "# Sample Carrier\n\nIntro line.\n\n## First Section\n\nFirst section body.\nSecond line of first section.\n\n## Second Section\n\nSecond section body.");
    assert.equal(result.truncated, false);
  });
});

test("extracts the body of one named section by case-insensitive heading match", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "areas/sample.md", section: "first section" });
    assert.equal(result.section, "first section");
    assert.equal(result.body, "First section body.\nSecond line of first section.\n");
    assert.equal(result.truncated, false);
  });
});

test("caps the reported outline to headingDepth", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "areas/sample.md", headingDepth: 1 });
    assert.deepEqual(result.outline, [{ title: "Sample Carrier", level: 1, line: 6 }]);
  });
});

test("truncates the body at maxCharacters and reports truncated: true", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "areas/sample.md", maxCharacters: 10 });
    assert.equal(result.body.length, 10);
    assert.equal(result.truncated, true);
  });
});

test("refuses a section that does not resolve to a heading, as a datum", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "areas/sample.md", section: "no such section" });
    assert.equal(result.kind, "red-cup-engineering.markdown-vault.read-carrier.refusal");
    assert.equal(result.reason, "section-not-found");
    assert.deepEqual(result.availableHeadings, ["Sample Carrier", "First Section", "Second Section"]);
  });
});

test("refuses a non-Markdown path, as a datum", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "areas/not-markdown.txt" });
    assert.deepEqual(result, { kind: "red-cup-engineering.markdown-vault.read-carrier.refusal", reason: "not-a-markdown-path", path: "areas/not-markdown.txt" });
  });
});

test("refuses a path outside the repository root, as a datum", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "../outside.md" });
    assert.equal(result.kind, "red-cup-engineering.markdown-vault.read-carrier.refusal");
    assert.equal(result.reason, "outside-repository-root");
  });
});

test("refuses a Markdown path that does not exist, as a datum", async () => {
  await withFixture(async (root) => {
    const result = await readMarkdownCarrier({ root, path: "areas/missing.md" });
    assert.equal(result.kind, "red-cup-engineering.markdown-vault.read-carrier.refusal");
    assert.equal(result.reason, "not-found");
  });
});
