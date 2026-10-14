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

test("only an explicitly public Markdown source enters the canonical publication selection",async()=>{
  const cases=[
    {id:"private-by-default",body:"---\nid: private-by-default\nstatus: published\npublish_to: public\n---\nSecret claim."},
    {id:"channel-only",body:"---\nid: channel-only\npublish: [site]\npublish_to: public\n---\nChannel choice is not rights."},
    {id:"public",body:"---\nid: public\nvisibility: public\npublish_to: site\n---\nLicensed public source."},
    {id:"revoked",body:"---\nid: revoked\nvisibility: public\npublish: false\npublish_to: site\n---\nOwner withdrew publication."},
    {id:"claimed-officer",body:"---\nid: claimed-officer\nincumbent: chatgpt-web\nstatus: completed\n---\nNot an appointment."},
  ];
  const parsed=cases.map(({id,body})=>({path:`science/${id}.md`,text:body+"\n"}));
  const result=projectMarkdownSemioticConceptUniverse({documents:parsed});
  assert.equal(result.ok,true);
  const {selectSemioticConceptPublication}=await import("@red-cup-engineering/signcell/semiotic-concept-universe");
  const selected=selectSemioticConceptPublication(result.value,{channels:["site"]});
  assert.deepEqual(selected.map(record=>record.id),["public"]);
  const declarations=cases.map(({id,body})=>projectMarkdownSemioticConceptDeclaration({path:`science/${id}.md`,text:body+"\n"}));
  for(const d of declarations.filter(d=>d.id!=="public"))assert.equal(d.publication.enabled,false,d.id);
  assert.equal(declarations.find(d=>d.id==="public").publication.enabled,true);
  assert.equal(declarations.find(d=>d.id==="claimed-officer").attributes.frontmatter.incumbent,"chatgpt-web");
  assert.equal(selectSemioticConceptPublication(result.value).length,1);
});

