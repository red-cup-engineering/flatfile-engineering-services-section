import assert from "node:assert/strict";
import test from "node:test";
import {
  createSemioticConceptUniverse,
  differentiateSemioticConceptUniverses,
  selectSemioticConceptPublication,
  semioticConceptUniverseType,
} from "../src/semiotic-concept-universe.mjs";

const concept = (id, extra = {}) => ({ id, title: id, body: `${id} body`, ...extra });

test("two authors' same_as declarations are claims, not a license to merge concept identities", () => {
  const admitted = createSemioticConceptUniverse({concepts:[
    concept("relation",{sameAs:["relationing"],tags:["b","a","a"],
      annotations:[{kind:"reference",target:"sign"},{kind:"reference",target:"missing"}]}),
    concept("relationing",{publication:{channels:["site"],status:"Draft"}}),
    concept("sign",{annotations:[{kind:"failure",reason:"unparsed"}]}),
  ]});
  assert.equal(admitted.ok,true);
  const universe=admitted.value;
  assert.equal(universe.kind,"sign.cell");
  assert.equal(universe.type,semioticConceptUniverseType.id);
  const {concepts,references,diagnostics,version}=universe.content;
  assert.equal(version,2);
  assert.equal(Object.hasOwn(universe.content,"equivalenceClasses"),false);
  assert.deepEqual(concepts.map(({id})=>id),["relation","relationing","sign"]);
  assert.deepEqual(concepts[0].tags,["a","b"]);
  const claim=references.find(ref=>ref.relation==="claimed-identity");
  assert.deepEqual([claim.source,claim.target,claim.status],
    ["relation","relationing","unverified-identity"]);
  assert.deepEqual(references.filter(ref=>ref.relation==="reference").map(ref=>[ref.target,ref.status]),
    [["missing","unresolved"],["sign","resolved"]]);
  assert.deepEqual(diagnostics.map(({code})=>code),
    ["annotation-failure","unresolved-reference","unverified-identity"]);
  assert.throws(()=>createSemioticConceptUniverse({concepts:[concept("a"),concept("a")]}),/unique/u);
  assert.throws(()=>createSemioticConceptUniverse({concepts:[concept("a",{annotations:[{kind:"guess"}]})]}),/unsupported/u);
});

test("publication retains separate authored identities and treats aliases as unverified",()=>{
  const universe=createSemioticConceptUniverse({concepts:[
    concept("relation",{sameAs:["relationing"]}),
    concept("relationing",{publication:{channels:["Site"],status:"Draft"}}),
    concept("hidden",{publication:{enabled:false,channels:["site"]}}),
  ]}).value;
  const all=selectSemioticConceptPublication(universe);
  assert.deepEqual(all.map(record=>record.id),["relation","relationing"]);
  assert.deepEqual(all.find(record=>record.id==="relation").claimedAliases,["relationing"]);
  const selected=selectSemioticConceptPublication(universe,{channels:["site"]});
  assert.deepEqual(selected.map(record=>record.id),["relationing"]);
  assert.equal(selected[0].title,"relationing");
  assert.equal(selected[0].concepts.length,1);
  assert.equal(selectSemioticConceptPublication(universe,{statuses:["published"]}).length,0);
  assert.throws(()=>selectSemioticConceptPublication({kind:"sign.cell",type:"other"}),TypeError);
});

test("undeclared alias cannot become a phantom canonical subject",()=>{
  const universe=createSemioticConceptUniverse({concepts:[concept("duty",{sameAs:["unrecorded-office"]})]}).value;
  assert.deepEqual(universe.content.concepts.map(item=>item.id),["duty"]);
  assert.equal(universe.content.references[0].status,"unresolved-identity");
  assert.equal(universe.content.diagnostics[0].code,"unresolved-identity");
  assert.deepEqual(selectSemioticConceptPublication(universe).map(record=>record.id),["duty"]);
});

test("differentiation names added, removed and changed independently authored concepts",()=>{
  const before=createSemioticConceptUniverse({concepts:[concept("a"),concept("b")]}).value;
  const after=createSemioticConceptUniverse({concepts:[concept("a",{body:"revised"}),concept("c")]}).value;
  const difference=differentiateSemioticConceptUniverses(before,after);
  assert.equal(difference.baselinePresent,true);
  assert.deepEqual(difference.concepts,{added:["c"],removed:["b"],changed:["a"]});
});
