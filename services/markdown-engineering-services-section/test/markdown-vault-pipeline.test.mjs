import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { observeMarkdownVaultDirectory } from "@red-cup-engineering/markdown-engineering-services-section/observe-markdown-vault-directory";
import { observeMarkdownDocumentIndex } from "@red-cup-engineering/markdown-engineering-services-section/observe-markdown-document-index";
import { deriveMarkdownVaultGraph } from "@red-cup-engineering/markdown-engineering-services-section/derive-markdown-vault-graph";

test("composes physical vault admission, document indexing, and semantic graphing", async () => {
  const root = await mkdtemp("/tmp/markdown-vault-pipeline-");
  try {
    await mkdir(`${root}/notes`);
    await writeFile(`${root}/notes/a.md`, "---\naliases: [Alpha]\n---\n# A\n[[B]]\n");
    await writeFile(`${root}/notes/b.md`, "# B\n[back](a.md#A)\n[[Missing]]\n");
    await writeFile(`${root}/notes/carrier.txt`, "[[A]]\n");

    const directory = await observeMarkdownVaultDirectory({ root });
    assert.deepEqual(directory.paths, ["notes/a.md", "notes/b.md"]);

    const documents = await observeMarkdownDocumentIndex({ root, paths: directory.paths });
    const graph = deriveMarkdownVaultGraph({ documents });
    assert.equal(graph.nodes.length, 2);
    assert.equal(graph.edges.filter((edge) => edge.status === "resolved").length, 2);
    assert.equal(graph.diagnostics.dangling, 1);
    assert.equal(graph.backlinks["notes/a.md"][0].fragment, "A");
    assert.equal(graph.backlinks["notes/b.md"][0].sourcePath, "notes/a.md");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
