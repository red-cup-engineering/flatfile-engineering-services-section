import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scanMarkdownTreeLinks, reportBrokenMarkdownLinks } from "../src/scan-markdown-tree-links.mjs";
import { observeMarkdownVaultDirectory } from "../src/observe-markdown-vault-directory.mjs";
import { writeMarkdownFile } from "../src/write-markdown-file.mjs";
import { planMarkdownTreeRelocationFromDisk } from "../src/plan-markdown-tree-relocation.mjs";
import { applyMarkdownTreeRelocation } from "../src/apply-markdown-tree-relocation.mjs";
import { command as planCommand } from "../src/run-plan-markdown-tree-relocation.mjs";


async function withFixture(files, run) {
  const root = await mkdtemp(join(tmpdir(), "relocate-markdown-tree-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      const full = join(root, path);
      await mkdir(join(full, ".."), { recursive: true });
      await writeFile(full, text);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("scan reports zero broken links over a clean fixture and reports a real dangling link", async () => {
  await withFixture({
    "index.md": "See [alpha](notes/alpha.md).\n",
    "notes/alpha.md": "Alpha.\n",
  }, async (root) => {
    const { graph } = await scanMarkdownTreeLinks({ root });
    assert.equal(reportBrokenMarkdownLinks(graph).length, 0);
  });
  await withFixture({
    "index.md": "See [ghost](notes/ghost.md).\n",
  }, async (root) => {
    const { graph } = await scanMarkdownTreeLinks({ root });
    const broken = reportBrokenMarkdownLinks(graph);
    assert.equal(broken.length, 1);
    assert.equal(broken[0].status, "dangling");
  });
});

test("plan-from-disk computes both an inside-out and an outside-in rewrite for one move", async () => {
  await withFixture({
    "notes/alpha.md": "See [shared](../shared/shared.md).\n",
    "shared/shared.md": "Shared.\n",
    "index.md": "See [alpha](notes/alpha.md#section-one).\n",
  }, async (root) => {
    const result = await planMarkdownTreeRelocationFromDisk({
      root, sourceDir: "notes", destDir: "docs/notes",
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory,
    });
    assert.equal(result.type, "MarkdownTreeRelocationSurvey");
    assert.equal(result.beforeBrokenCount, 0);
    assert.deepEqual(result.sourceInventory.paths, ["notes/alpha.md"]);
    const byFile = Object.fromEntries(result.plan.files.map((f) => [f.filePath, f.edits]));
    assert.deepEqual(byFile["notes/alpha.md"], [{ target: "../shared/shared.md", replacement: "../../shared/shared.md" }]);
    assert.deepEqual(byFile["index.md"], [{ target: "notes/alpha.md#section-one", replacement: "docs/notes/alpha.md#section-one" }]);
  });
});

test("apply rewrites content in place, preserves unrelated bytes, and verifies zero broken links after", async () => {
  await withFixture({
    "notes/alpha.md": "Intro.\r\n\r\nSee [shared](../shared/shared.md) and unrelated `code(alpha.md)` text.\r\n",
    "shared/shared.md": "# Section One\nShared.\n",
    "index.md": "See [alpha](notes/alpha.md#section-one) again: [alpha](notes/alpha.md#section-one).\n",
    "other/untouched.md": "Nothing here points at notes.\n",
  }, async (root) => {
    const beforeAlpha = await readFile(join(root, "notes/alpha.md"), "utf8");
    const beforeUntouched = await readFile(join(root, "other/untouched.md"), "utf8");

    const result = await applyMarkdownTreeRelocation({
      root, sourceDir: "notes", destDir: "docs/notes",
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory, write: writeMarkdownFile,
    });

    assert.equal(result.beforeBrokenCount, 0);
    assert.equal(result.afterBrokenCount, 0);
    assert.equal(result.ok, true);
    assert.equal(result.writes.length, 2);

    const afterAlpha = await readFile(join(root, "notes/alpha.md"), "utf8");
    assert.equal(afterAlpha, "Intro.\r\n\r\nSee [shared](../../shared/shared.md) and unrelated `code(alpha.md)` text.\r\n");
    assert.notEqual(afterAlpha, beforeAlpha);
    // CRLF and the untouched inline-code mention survive the edit untouched.
    assert.match(afterAlpha, /\r\n\r\n/);
    assert.match(afterAlpha, /`code\(alpha\.md\)`/);

    const afterIndex = await readFile(join(root, "index.md"), "utf8");
    assert.equal(
      afterIndex,
      "See [alpha](docs/notes/alpha.md#section-one) again: [alpha](docs/notes/alpha.md#section-one).\n",
    );

    const afterUntouched = await readFile(join(root, "other/untouched.md"), "utf8");
    assert.equal(afterUntouched, beforeUntouched);
  });
});

test("apply leaves the tree with zero net rewrites when the move affects no links", async () => {
  await withFixture({
    "notes/alpha.md": "See [beta](beta.md).\n",
    "notes/beta.md": "Beta.\n",
  }, async (root) => {
    const result = await applyMarkdownTreeRelocation({
      root, sourceDir: "notes", destDir: "docs/notes",
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory, write: writeMarkdownFile,
    });
    assert.equal(result.writes.length, 0);
    assert.equal(result.ok, true);
    const text = await readFile(join(root, "notes/alpha.md"), "utf8");
    assert.equal(text, "See [beta](beta.md).\n");
  });
});

test("apply accepts inherited broken links when the projected move introduces none", async () => {
  await withFixture({
    "notes/alpha.md": "See [shared](../shared.md) and [missing](missing.md).\n",
    "shared.md": "Shared.\n",
    "index.md": "See [alpha](notes/alpha.md).\n",
  }, async (root) => {
    const result = await applyMarkdownTreeRelocation({
      root, sourceDir: "notes", destDir: "content/text",
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory, write: writeMarkdownFile,
    });
    assert.equal(result.beforeBrokenCount, 1);
    assert.equal(result.afterBrokenCount, 1);
    assert.equal(result.newBrokenCount, 0);
    assert.equal(result.ok, true);
  });
});

test("a complete source inventory distinguishes nine carriers from zero link rewrites", async () => {
  const files = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`notes/glossary/term-${index}.md`, `# term-${index}\n`]).concat([["notes/archive/plan.md", "# plan\n"]]));
  await withFixture(files, async (root) => {
    const result = await planMarkdownTreeRelocationFromDisk({
      root, sourceDir: "notes", destDir: "content/text",
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory,
    });
    assert.equal(result.type, "MarkdownTreeRelocationSurvey");
    assert.equal(result.sourceInventory.count, 9);
    assert.equal(result.sourceInventory.coverage.truncated, false);
    assert.equal(result.plan.files.length, 0);
    assert.equal(result.plan.rewrites.length, 0);
  });
});

test("an incomplete relation universe refuses before an apply can write", async () => {
  await withFixture({
    "notes/alpha.md": "See [outside](../outside.md).\n",
    "outside.md": "Outside.\n",
  }, async (root) => {
    const before = await readFile(join(root, "notes/alpha.md"), "utf8");
    const plan = await planMarkdownTreeRelocationFromDisk({
      root, sourceDir: "notes", destDir: "content/text", limit: 1,
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory,
    });
    assert.equal(plan.type, "MarkdownTreeRelocationRefusal");
    assert.equal(plan.reason, "relation-universe-incomplete");
    assert.equal(plan.sourceInventory.count, 1);
    const result = await applyMarkdownTreeRelocation({
      root, sourceDir: "notes", destDir: "content/text", limit: 1,
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory, write: writeMarkdownFile,
    });
    assert.equal(result.type, "MarkdownTreeRelocationRefusal");
    assert.equal(result.reason, "relation-universe-incomplete");
    assert.equal(await readFile(join(root, "notes/alpha.md"), "utf8"), before);
  });
});

test("a truncated source inventory is a refusal and coverage does not repeat paths", async () => {
  await withFixture({
    "notes/alpha.md": "Alpha.\n",
    "notes/beta.md": "Beta.\n",
    "unrelated/hidden.md": "Hidden.\n",
  }, async (root) => {
    const result = await planMarkdownTreeRelocationFromDisk({
      root, sourceDir: "notes", destDir: "content/text", limit: 1,
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory,
    });
    assert.equal(result.type, "MarkdownTreeRelocationRefusal");
    assert.equal(result.reason, "source-inventory-incomplete");
    assert.deepEqual(result.sourceInventory.paths, ["notes/alpha.md"]);
    assert.equal("paths" in result.sourceInventory.coverage, false);
    assert.equal("paths" in result.relationCoverage, false);
    assert.deepEqual({ limit: result.sourceInventory.coverage.limit, maxScan: result.sourceInventory.coverage.maxScan }, { limit: 1, maxScan: 20_000 });
    assert.deepEqual({ limit: result.relationCoverage.limit, maxScan: result.relationCoverage.maxScan }, { limit: 1, maxScan: 200_000 });
    assert.equal(JSON.stringify(result).includes("unrelated/hidden.md"), false);
  });
});

test("a scoped relation universe refuses a relocation boundary it does not contain", async () => {
  await withFixture({ "notes/alpha.md": "Alpha.\n", "content/text/existing.md": "Existing.\n" }, async (root) => {
    const result = await planMarkdownTreeRelocationFromDisk({
      root, sourceDir: "notes", destDir: "content/text", region: "notes",
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory,
    });
    assert.equal(result.type, "MarkdownTreeRelocationRefusal");
    assert.equal(result.reason, "relation-universe-excludes-relocation-boundary");
    assert.equal(result.relationCoverage.region, "notes");
  });
});

test("a post-write incomplete scan returns the written paths without claiming success", async () => {
  await withFixture({
    "notes/alpha.md": "See [shared](../shared.md).\n",
    "shared.md": "Shared.\n",
    "index.md": "See [alpha](notes/alpha.md).\n",
  }, async (root) => {
    let calls = 0;
    const scan = async (options) => {
      const result = await scanMarkdownTreeLinks(options);
      calls += 1;
      if (calls === 2) return { ...result, truncated: true, observation: { ...result.observation, truncated: true } };
      return result;
    };
    const result = await applyMarkdownTreeRelocation({
      root, sourceDir: "notes", destDir: "content/text",
      scan, observe: observeMarkdownVaultDirectory, write: writeMarkdownFile,
    });
    assert.equal(result.type, "MarkdownTreeRelocationRefusal");
    assert.equal(result.reason, "post-apply-relation-universe-incomplete");
    assert.deepEqual(result.writes.map((write) => write.filePath).sort(), ["index.md", "notes/alpha.md"]);
    assert.equal("ok" in result, false);
  });
});

test("plan command prints help and settles a typed incomplete-survey refusal to a nonzero status", async () => {
  let help = "";
  await planCommand.run({ argv: ["--help"], stdout: { write(text) { help += text; } } });
  assert.match(help, /Plans Markdown link rewrites only/u);
  await withFixture({
    "notes/alpha.md": "See [outside](../outside.md).\n",
    "outside.md": "Outside.\n",
  }, async (root) => {
    const result = await planCommand.run({ argv: [root, "notes", "content/text", "", "1"], stdout: { write() {} } });
    assert.equal(result.type, "MarkdownTreeRelocationRefusal");
    assert.equal(planCommand.resultExitCode(result), 1);
  });
});
