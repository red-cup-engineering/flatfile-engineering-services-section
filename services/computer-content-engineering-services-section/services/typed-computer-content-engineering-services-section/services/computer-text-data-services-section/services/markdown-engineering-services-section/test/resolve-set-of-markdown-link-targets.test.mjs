import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  resolveSetOfMarkdownLinkTargets,
  walkMarkdownLinkTargets,
} from "../src/resolve-set-of-markdown-link-targets.mjs";

const SCRIPT = fileURLToPath(new URL("../src/resolve-set-of-markdown-link-targets.mjs", import.meta.url));

async function tempRoot() {
  return mkdtemp(join(tmpdir(), "resolve-set-of-markdown-link-targets-"));
}

test("resolves every link feature in one carrier's text, and leaves fenced-code links excluded", async () => {
  const root = await tempRoot();
  await writeFile(join(root, "sibling.md"), "# Sibling\n");
  const carrierPath = join(root, "carrier.md");
  const text = [
    "[Sibling](sibling.md)",
    "![Diagram](sibling.md)",
    "[[Sibling]]",
    "```",
    "[Fenced](nowhere.md)",
    "```",
  ].join("\n");
  const entries = await resolveSetOfMarkdownLinkTargets(text, { carrierPath, root });

  const markdownLink = entries.find((entry) => entry.type === "markdown-link" && !entry.image);
  assert.equal(markdownLink.resolution.status, "resolved");
  assert.equal(markdownLink.resolution.path, "sibling.md");

  const image = entries.find((entry) => entry.type === "markdown-link" && entry.image);
  assert.equal(image.label, "Diagram");
  assert.equal(image.resolution.status, "resolved");

  const wikilink = entries.find((entry) => entry.type === "wikilink");
  assert.equal(wikilink.target, "Sibling");
  // "Sibling" has no extension on disk under this name, so the plain-path
  // resolver reports it missing rather than inventing title-based matching
  // (that vault-wide alias resolution is markdown-vault-graph's job).
  assert.equal(wikilink.resolution.status, "missing");

  assert.equal(entries.some((entry) => entry.target === "nowhere.md"), false);
  assert.equal(entries.length, 3);

  await rm(root, { recursive: true, force: true });
});

test("resolves a wikilink target that names an existing file", async () => {
  const root = await tempRoot();
  await writeFile(join(root, "sibling.md"), "# Sibling\n");
  const carrierPath = join(root, "carrier.md");
  const entries = await resolveSetOfMarkdownLinkTargets("[[sibling.md]]", { carrierPath, root });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, "wikilink");
  assert.equal(entries[0].resolution.status, "resolved");
  await rm(root, { recursive: true, force: true });
});

test("walks a subtree, ignoring node_modules and lib/legacy, and reports every unresolved link", async () => {
  const root = await tempRoot();
  await writeFile(join(root, "sibling.md"), "# Sibling\n");
  await writeFile(join(root, "carrier.md"), "[Broken](missing.md) and [OK](sibling.md)\n");

  await mkdir(join(root, "node_modules", "ignored-package"), { recursive: true });
  await writeFile(join(root, "node_modules", "ignored-package", "readme.md"), "[Ignored](also-missing.md)\n");

  await mkdir(join(root, "lib", "legacy"), { recursive: true });
  await writeFile(join(root, "lib", "legacy", "old.md"), "[AlsoIgnored](also-missing.md)\n");

  const outside = await mkdtemp(join(tmpdir(), "resolve-set-of-markdown-link-targets-outside-"));
  await writeFile(join(outside, "secret.md"), "# Secret\n");
  await symlink(join(outside, "secret.md"), join(root, "escape-link.md"));
  await writeFile(join(root, "escaper.md"), "[Escapes](escape-link.md)\n");

  const { checked, unresolved } = await walkMarkdownLinkTargets({ root });

  assert.equal(checked, 3);
  assert.equal(unresolved.length, 2);
  const statuses = unresolved.map((entry) => entry.status).sort();
  assert.deepEqual(statuses, ["escaped", "missing"]);
  assert.equal(unresolved.every((entry) => entry.carrierPath.startsWith(root)), true);
  assert.equal(unresolved.some((entry) => entry.label === "Broken"), true);

  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

test("CLI resolves given carrier paths, reports one resolved and one missing link, and exits 1", async () => {
  const root = await tempRoot();
  await writeFile(join(root, "sibling.md"), "# Sibling\n");
  await writeFile(join(root, "carrier.md"), "[OK](sibling.md) and [Broken](missing.md)\n");

  const result = spawnSync(process.execPath, [SCRIPT, "carrier.md", "--root", root], { encoding: "utf8" });

  assert.equal(result.status, 1);
  const readout = JSON.parse(result.stdout);
  assert.equal(readout.files, 1);
  assert.equal(readout.links, 2);
  assert.equal(readout.unresolved.length, 1);
  assert.equal(readout.unresolved[0].target, "missing.md");
  assert.equal(readout.unresolved[0].status, "missing");

  await rm(root, { recursive: true, force: true });
});

test("CLI exits 0 and reports zero unresolved links when every link resolves, reading carrier paths from stdin", async () => {
  const root = await tempRoot();
  await writeFile(join(root, "sibling.md"), "# Sibling\n");
  await writeFile(join(root, "carrier.md"), "[OK](sibling.md)\n");

  const result = spawnSync(process.execPath, [SCRIPT, "--root", root], {
    input: "carrier.md\n",
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  const readout = JSON.parse(result.stdout);
  assert.equal(readout.files, 1);
  assert.equal(readout.links, 1);
  assert.deepEqual(readout.unresolved, []);

  await rm(root, { recursive: true, force: true });
});

test("CLI refuses with exit 2 when no carrier paths are given at all", () => {
  const result = spawnSync(process.execPath, [SCRIPT], { input: "", encoding: "utf8" });
  assert.equal(result.status, 2);
  const readout = JSON.parse(result.stdout);
  assert.match(readout.error, /no carrier paths given/u);
});
