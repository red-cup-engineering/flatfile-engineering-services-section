import test from "node:test";
import assert from "node:assert/strict";
import { deriveExampleClassCategory } from "../../src/closure/formal-concepts.mjs";

// No company, ministry, regulation, paid offer, network or authority appears
// in the generic mathematical producer. Names only stand for distinct Mark
// observations already admitted by the caller of this pure FCA operation.
const base = ["common-operation","external-beneficiary"];
const G = [
  ["fda-food",["institutional-trigger","administrative-preparation"]],
  ["permit",["institutional-trigger","administrative-preparation"]],
  ["agent",["institutional-trigger","continuing-appointment"]],
  ["seo",["attention-discovery","measured-visibility"]],
  ["ads",["attention-discovery","measured-visibility"]],
  ["third-party-logistics",["merchant-order","delegated-fulfillment"]],
  ["print-on-demand",["merchant-order","delegated-fulfillment"]]
];
const objects = rows => rows.map(([id,facets])=>({id,attrs:new Set([...base,...facets])}));
const derive = (rows,id)=>deriveExampleClassCategory(objects(rows),x=>x,id);
const hasMembers = (concept, members) => concept.extent.length===members.length &&
  members.every(member => concept.extent.includes(member));

test("institutional preparation example derives class then its immediately broader triggered-work category",()=>{
  const result=derive(G,"fda-food");
  assert.equal(result.kind,"metrologic.fca.example-class-category.v1");
  assert.equal(result.state,"derived-class-and-category-candidates");
  const relevant=result.paths.find(path=>hasMembers(path.class,["fda-food","permit"]));
  assert.ok(relevant);
  assert.ok(relevant.categoryCandidates.some(c=>hasMembers(c,["fda-food","permit","agent"])));
  assert.ok(!relevant.categoryCandidates.some(c=>c.extent.length===G.length),
    "the immediately broader category is not automatically the entire observation universe");
  assert.ok(result.covers.some(c=>c.from===relevant.class.key &&
    relevant.categoryCandidates.some(parent=>c.to===parent.key)));
  assert.ok(result.arrows.some(a=>a.from===relevant.class.key && a.to===relevant.class.key),
    "the supported thin category contains identity arrows");
});

test("different real example derives a different class in the SAME generic mathematical code",()=>{
  const result=derive(G,"print-on-demand");
  assert.ok(result.paths.some(p=>hasMembers(p.class,["third-party-logistics","print-on-demand"])));
  assert.ok(result.paths.every(p=>p.categoryCandidates.some(parent=>parent.extent.length===G.length)));
  assert.ok(result.paths.every(p=>p.class.intent.includes("delegated-fulfillment")));
});

test("multiple incomparable classes containing the same example remain alternatives",()=>{
  const enriched=G.map(([id,attrs])=>id==="ads"
    ? [id,[...attrs,"merchant-order","delegated-fulfillment"]]:[id,attrs]);
  const result=derive(enriched,"ads");
  assert.equal(result.state,"derived-class-and-category-candidates");
  assert.ok(result.paths.length>=2,"one example may have multiple defensible classes");
  assert.ok(result.paths.some(p=>hasMembers(p.class,["ads","seo"])));
  assert.ok(result.paths.some(p=>hasMembers(p.class,
    ["ads","print-on-demand","third-party-logistics"])));
});

test("an unrelated example does not erase locally derived classes, but an empty-intent top is not meaningful category",()=>{
  const unrelated=[...G,["internal-note",["internal-only"]]];
  const fda=deriveExampleClassCategory(objects(unrelated.map(([id,attrs])=>[id,attrs])),x=>x,"fda-food");
  const path=fda.paths.find(p=>hasMembers(p.class,["fda-food","permit"]));
  assert.ok(path);
  assert.ok(path.categoryCandidates.some(p=>hasMembers(p,["agent","fda-food","permit"])));
  assert.ok(!fda.top.intent.includes("institutional-trigger"));
  const bare=deriveExampleClassCategory(objects([
    ["a",["manufacture"]],["b",["manufacture"]],["z",["unrelated"]]
  ]).map(item=>({...item,attrs:new Set([...item.attrs].filter(a=>a!=="common-operation"&&a!=="external-beneficiary"))})),
    x=>x,"a");
  assert.equal(bare.state,"class-derived-without-grounded-parent-category");
  assert.equal(bare.paths[0].categoryCandidates.length,0);
  assert.equal(bare.paths[0].parentWithNoSharedAttribute.length,1);
});

test("a unique individual with no observed sibling has no falsely fabricated class",()=>{
  const r=derive([...G,["solo",["unrelated-unique"]]],"solo");
  assert.equal(r.state,"no-shared-nontrivial-class");
  assert.deepEqual(r.paths,[]);
});

test("exact FCA refuses fallback rather than declaring approximate greedy grouping a category",()=>{
  const many=Array.from({length:501},(_,n)=>"facet-"+n);
  const items=[{id:"a",attrs:new Set(many)},{id:"b",attrs:new Set(many)}];
  assert.throws(()=>deriveExampleClassCategory(items,x=>x,"a"),
    /exact FCA requires source-bounded computation/);
});

test("original identities and finite incidences must be admitted",()=>{
  assert.throws(()=>deriveExampleClassCategory(objects(G),x=>x,"unseen"),/focus must name/);
  assert.throws(()=>deriveExampleClassCategory(objects([["same",["x"]],["same",["y"]]]),x=>x,"same"),/distinct original member/);
  assert.throws(()=>deriveExampleClassCategory([{id:"a",attrs:[]}],x=>x,"a"),/finite attribute sets/);
  assert.throws(()=>deriveExampleClassCategory([{id:"a",attrs:new Set([""])}],x=>x,"a"),/finite attribute sets/);
});
