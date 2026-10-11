import assert from "node:assert/strict";
import test from "node:test";
import { deriveMarkdownVaultGraph } from "../src/derive-markdown-vault-graph.mjs";

test("derives resolved, dangling, external, transclusion, frontmatter, and backlink edges", () => {
  const graph = deriveMarkdownVaultGraph({ documents: [
    {
      path: "notes/a.md",
      frontmatter: { aliases: ["Alpha"], related: ["[[B]]"] },
      features: [
        { type: "wikilink", target: "B" },
        { type: "transclusion", target: "missing#Part" },
        { type: "markdown-link", target: "https://example.com", image: false },
      ],
    },
    { path: "notes/b.md", frontmatter: {}, features: [{ type: "markdown-link", target: "a.md#Top", image: false }] },
  ] });
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.filter((edge) => edge.status === "resolved").length, 3);
  assert.equal(graph.diagnostics.dangling, 1);
  assert.deepEqual(graph.externalUrls, ["https://example.com"]);
  assert.equal(graph.backlinks["notes/b.md"].length, 2);
  assert.equal(graph.backlinks["notes/a.md"][0].fragment, "Top");
});

test("reports ambiguous basename and alias targets rather than choosing one", () => {
  const graph = deriveMarkdownVaultGraph({ documents: [
    { path: "one/topic.md", frontmatter: {}, features: [] },
    { path: "two/topic.md", frontmatter: {}, features: [] },
    { path: "index.md", frontmatter: {}, features: [{ type: "wikilink", target: "topic" }] },
  ] });
  const edge = graph.edges[0];
  assert.equal(edge.status, "ambiguous");
  assert.deepEqual(edge.candidates, ["one/topic.md", "two/topic.md"]);
});
