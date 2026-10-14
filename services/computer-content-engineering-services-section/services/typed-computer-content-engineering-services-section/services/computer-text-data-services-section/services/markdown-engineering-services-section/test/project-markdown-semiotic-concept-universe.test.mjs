import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

test("Markdown source-revision address survives into independently authored SignCell concepts",()=>{
  const textA="---\nid: duty\ntitle: Duty\nsame_as: obligation\n---\nA duty is owed.\n";
  const textB="---\nid: obligation\ntitle: Obligation\nsame_as: duty\n---\nAn obligation is binding.\n";
  const a=projectMarkdownSemioticConceptDeclaration({path:"science/duty.md",text:textA});
  const b=projectMarkdownSemioticConceptDeclaration({path:"operations/obligation.md",text:textB});
  assert.equal(a.source.revision,"sha256:"+createHash("sha256").update(textA,"utf8").digest("hex"));
  assert.equal(b.source.revision,"sha256:"+createHash("sha256").update(textB,"utf8").digest("hex"));
  assert.notEqual(a.source.revision,b.source.revision);
  assert.notEqual(projectMarkdownSemioticConceptDeclaration({
    path:"science/duty.md",text:textA+"Additional statement.\n"
  }).source.revision,a.source.revision);
  const universe=projectMarkdownSemioticConceptUniverse({documents:[
    {path:"science/duty.md",text:textA},{path:"operations/obligation.md",text:textB},
  ]}).value;
  assert.equal(universe.content.version,2);
  assert.equal(Object.hasOwn(universe.content,"equivalenceClasses"),false);
  assert.deepEqual(universe.content.concepts.map(x=>x.id),["duty","obligation"]);
  assert.deepEqual(universe.content.references.filter(ref=>ref.relation==="claimed-identity")
    .map(ref=>[ref.source,ref.target,ref.status]),
    [["duty","obligation","unverified-identity"],["obligation","duty","unverified-identity"]]);
});
