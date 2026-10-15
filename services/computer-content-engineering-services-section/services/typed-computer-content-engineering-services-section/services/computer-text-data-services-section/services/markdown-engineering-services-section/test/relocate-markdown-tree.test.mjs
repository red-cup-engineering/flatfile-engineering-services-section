import assert from "node:assert/strict";
import test from "node:test";
import { deriveMarkdownVaultGraph } from "@red-cup-engineering/markdown-engineering-services-section/derive-markdown-vault-graph";
import { readMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";
import {
  countBoundaryBrokenLinks,
  planMarkdownTreeRelocation,
  relocatedMarkdownPath,
  relocateMarkdownVaultDocumentPaths,
} from "../src/relocate-markdown-tree.mjs";

function graphOf(files) {
  const documents = Object.entries(files).map(([path, text]) => ({
    path,
    features: readMarkdownFeatures(text),
    frontmatter: null,
  }));
  return deriveMarkdownVaultGraph({ documents });
}

test("relocatedMarkdownPath rewrites only paths under sourceDir", () => {
  assert.equal(relocatedMarkdownPath("notes/alpha.md", "notes", "docs/notes"), "docs/notes/alpha.md");
  assert.equal(relocatedMarkdownPath("notes/sub/beta.md", "notes", "docs/notes"), "docs/notes/sub/beta.md");
  assert.equal(relocatedMarkdownPath("other/gamma.md", "notes", "docs/notes"), "other/gamma.md");
});

test("plan rewrites an inside-out link (moving tree points at a target that stays put)", () => {
  const graph = graphOf({
    "notes/alpha.md": "See [shared](../shared/shared.md).",
    "shared/shared.md": "Shared page.",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.equal(plan.files.length, 1);
  assert.equal(plan.files[0].filePath, "notes/alpha.md");
  assert.deepEqual(plan.files[0].edits, [{ target: "../shared/shared.md", replacement: "../../shared/shared.md" }]);
});

test("plan rewrites an outside-in link (an untouched file points at the moving tree)", () => {
  const graph = graphOf({
    "index.md": "See [alpha](notes/alpha.md).",
    "notes/alpha.md": "Alpha page.",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.equal(plan.files.length, 1);
  assert.equal(plan.files[0].filePath, "index.md");
  assert.deepEqual(plan.files[0].edits, [{ target: "notes/alpha.md", replacement: "docs/notes/alpha.md" }]);
});

test("plan preserves a link's fragment across the rewrite", () => {
  const graph = graphOf({
    "index.md": "See [part](notes/alpha.md#part-two).",
    "notes/alpha.md": "# Part Two\nAlpha page.",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.deepEqual(plan.files[0].edits, [{ target: "notes/alpha.md#part-two", replacement: "docs/notes/alpha.md#part-two" }]);
});

test("plan leaves an internal link (both endpoints inside the moving tree) untouched", () => {
  const graph = graphOf({
    "notes/alpha.md": "See [beta](beta.md).",
    "notes/beta.md": "Beta page.",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.equal(plan.files.length, 0);
  assert.equal(plan.rewrites.length, 0);
});

test("plan leaves a link entirely outside the moving tree untouched", () => {
  const graph = graphOf({
    "other/a.md": "See [b](../more/b.md).",
    "more/b.md": "B page.",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.equal(plan.files.length, 0);
});

test("plan handles a link through a renamed parent directory correctly (destDir renames an ancestor, not just relocates a leaf)", () => {
  const graph = graphOf({
    "legacy/topic/alpha.md": "See [shared](../../shared/shared.md).",
    "shared/shared.md": "Shared page.",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "legacy/topic", destDir: "current/topic" });
  // legacy/topic and current/topic are the same depth, so the relative prefix
  // to the untouched shared/ target is unchanged and no edit is needed; a
  // rename that changes depth (below) does need one:
  assert.equal(plan.files.length, 0);
  const graphDeeper = graphOf({
    "legacy/a/b/alpha.md": "See [shared](../../../shared/shared.md).",
    "shared/shared.md": "Shared page.",
  });
  const deeperPlan = planMarkdownTreeRelocation({ graph: graphDeeper, sourceDir: "legacy/a/b", destDir: "current/nested/deep/b" });
  assert.deepEqual(deeperPlan.files[0].edits, [{ target: "../../../shared/shared.md", replacement: "../../../../shared/shared.md" }]);
});

test("plan dedupes repeated identical targets in one file into a single edit", () => {
  const graph = graphOf({
    "index.md": "See [a](notes/alpha.md) and again [a2](notes/alpha.md).",
    "notes/alpha.md": "Alpha page.",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.equal(plan.files[0].edits.length, 1);
});

test("plan skips a dangling link (unresolved targets are not rewritten)", () => {
  const graph = graphOf({
    "notes/alpha.md": "See [missing](missing.md).",
  });
  const plan = planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.equal(plan.files.length, 0);
});

test("plan rejects an equal sourceDir and destDir", () => {
  const graph = graphOf({ "notes/alpha.md": "x" });
  assert.throws(() => planMarkdownTreeRelocation({ graph, sourceDir: "notes", destDir: "notes" }), TypeError);
});

test("relocateMarkdownVaultDocumentPaths relabels only documents under sourceDir", () => {
  const documents = [
    { path: "notes/alpha.md", features: [], frontmatter: null },
    { path: "other/beta.md", features: [], frontmatter: null },
  ];
  const relocated = relocateMarkdownVaultDocumentPaths({ documents, sourceDir: "notes", destDir: "docs/notes" });
  assert.deepEqual(relocated.map((d) => d.path), ["docs/notes/alpha.md", "other/beta.md"]);
});

test("countBoundaryBrokenLinks counts only edges touching sourceDir or destDir", () => {
  const graph = graphOf({
    "notes/alpha.md": "See [missing](missing.md).",
    "elsewhere/gamma.md": "See [also-missing](also-missing.md).",
  });
  const boundary = countBoundaryBrokenLinks({ graph, sourceDir: "notes", destDir: "docs/notes" });
  assert.equal(boundary.count, 1);
  assert.equal(boundary.edges[0].sourcePath, "notes/alpha.md");
});
