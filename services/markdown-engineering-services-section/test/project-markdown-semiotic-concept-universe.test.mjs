import assert from "node:assert/strict";
import test from "node:test";
import {
  projectMarkdownSemioticConceptDeclaration,
  projectMarkdownSemioticConceptUniverse,
} from "../src/project-markdown-semiotic-concept-universe.mjs";

test("Markdown declarations retain legacy annotation and publication meaning in a SignCell", () => {
  const result = projectMarkdownSemioticConceptUniverse({ documents: [
    { path: "content/a.md", text: "---\nid: a\ntitle: Concept A\nann: [tag:intro, 'ref:[[b]]']\npublish_to: public\n---\nA references B.\n" },
    { path: "content/b.md", text: "---\nid: b\nsame_as: b-alias\nann: [{key: level, value: 2}, {ref: c}]\n---\n# Concept B\n" },
  ] });
  assert.equal(result.ok, true);
  assert.equal(result.value.content.references.find(({ requestedTarget }) => requestedTarget === "b").status, "resolved");
  assert.equal(result.value.content.diagnostics.find(({ code }) => code === "unresolved-reference").target, "c");
  assert.equal(result.value.content.concepts.find(({ id }) => id === "a").publication.channels[0], "public");
});

test("an invalid declaration remains an explicit failure rather than becoming prose evidence", () => {
  const declaration = projectMarkdownSemioticConceptDeclaration({ path: "content/no-id.md", text: "---\nann: [7]\n---\n# Fallback title\n" });
  assert.equal(declaration.id, "no-id");
  assert.equal(declaration.annotations[0].kind, "failure");
  assert.equal(declaration.title, "Fallback title");
});
