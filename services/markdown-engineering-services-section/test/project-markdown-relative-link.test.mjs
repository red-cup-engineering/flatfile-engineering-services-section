import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { projectMarkdownRelativeLink } from "../src/project-markdown-relative-link.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/project-markdown-relative-link.mjs");

test("projects a sibling-directory link with the correct ../ chain", () => {
  assert.equal(
    projectMarkdownRelativeLink("a/b/c/d/carrier.md", "a/b/target.md"),
    "../../target.md",
  );
});

test("projects a same-directory link as a bare filename", () => {
  assert.equal(projectMarkdownRelativeLink("notes/alpha.md", "notes/beta.md"), "beta.md");
});

test("projects a deep sixteen-level ../ chain correctly", () => {
  const carrier = Array.from({ length: 16 }, (_, index) => `level-${index}`).join("/") + "/carrier.md";
  const target = "root-target.md";
  const link = projectMarkdownRelativeLink(carrier, target);
  assert.equal(link, `${"../".repeat(16)}root-target.md`);
});

test("projects a descending link into a subdirectory", () => {
  assert.equal(projectMarkdownRelativeLink("notes/alpha.md", "notes/sub/beta.md"), "sub/beta.md");
});

test("throws on a non-string or empty argument", () => {
  assert.throws(() => projectMarkdownRelativeLink("", "a.md"), TypeError);
  assert.throws(() => projectMarkdownRelativeLink("a.md", ""), TypeError);
});

test("CLI prints the relative link and exits 0", () => {
  const output = execFileSync(process.execPath, [SCRIPT, "a/b/c/d/carrier.md", "a/b/target.md"], { encoding: "utf8" });
  assert.equal(output, "../../target.md\n");
});

test("CLI exits 2 with usage on missing arguments", () => {
  assert.throws(() => execFileSync(process.execPath, [SCRIPT, "only-one-arg.md"], { encoding: "utf8" }));
});
