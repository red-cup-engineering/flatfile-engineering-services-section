import assert from "node:assert/strict";
import test from "node:test";
import { createSignClaim, readSignClaim, conflateClaims } from "../src/semantic-claim.mjs";

const ref = Object.freeze({ id: "ni:sha-256;source", type: "test.claim-source@1" });
import { knowledgeReading } from "../src/cell.mjs";
const told = (sides = {}) => createSignClaim({ subject: ref, predicate: "rumor", object: ref, ...sides });
test("claim confluence preserves independent evidence and reads knowledge off it", () => {
  const positive = told({ for: ["witness-a"] });
  const negative = told({ against: ["witness-b"] });
  assert.equal(positive.ok, true);
  assert.equal(negative.ok, true);
  assert.equal(knowledgeReading(conflateClaims(positive.value, negative.value).value), "stable");
  assert.equal(knowledgeReading(conflateClaims(positive.value, positive.value).value), "potential");
  assert.equal(knowledgeReading(conflateClaims(told().value, negative.value).value), "active");
  assert.equal(conflateClaims(positive.value, { ...negative.value, predicate: "another" }).ok, false);
  assert.equal(createSignClaim({ subject: { id: "not-an-ni", type: ref.type }, predicate: "rumor", object: ref, for: ["witness-a"] }).ok, false);
  assert.equal(told({ reading: "true" }).ok, false);
});

test("legacy sign.claim with reading is refused rather than converted into synthetic witnesses", () => {
  const legacy = {kind:"sign.claim",subject:ref,predicate:"rumor",object:ref,reading:"true"};
  assert.equal(readSignClaim(legacy, "external-witness").ok, false);
  assert.equal(readSignClaim(legacy).ok, false);
  assert.equal(readSignClaim({subject:ref,predicate:"rumor",object:ref,for:["source-witness"],against:[]}).ok,true);
});

test("financial horizon is part of proposition identity, not contradictory evidence", () => {
  const fiveDay = createSignClaim({subject:ref,predicate:"forecast:asset-return:5d",object:ref,for:["five-day-model"]});
  const sixtyDay = createSignClaim({subject:ref,predicate:"forecast:asset-return:60d",object:ref,against:["sixty-day-model"]});
  assert.equal(fiveDay.ok,true);
  assert.equal(sixtyDay.ok,true);
  assert.equal(conflateClaims(fiveDay.value,sixtyDay.value).ok,false);
});

test("source-qualified positing order is commutative, associative and idempotent on one claim fiber", () => {
  // Operational reading of Obsmetrologia.Valuation.posit_comm,
  // posit_posit_same and posit_idem on the existing SignCell evidence carrier.
  // This is a finite runtime conformance test, NOT a newly compiled Lean proof.
  const empty = told().value;
  const a = told({for:["source:a"]}).value;
  const b = told({against:["source:b"]}).value;
  const c = told({for:["source:c"]}).value;
  const merge = (x,y) => {
    const result = conflateClaims(x,y);
    assert.equal(result.ok,true);
    return result.value;
  };
  const compare = x => ({for:x.for,against:x.against,reading:knowledgeReading(x)});
  assert.deepEqual(compare(merge(a,b)),compare(merge(b,a)),
    "source order must not affect the resulting FOUR evidence");
  assert.deepEqual(compare(merge(merge(a,b),c)),compare(merge(a,merge(b,c))),
    "associating independent posits may not change the result");
  assert.deepEqual(compare(merge(a,a)),compare(a),
    "repeating identical source witness must not change the claim");
  assert.deepEqual(compare(merge(empty,a)),compare(a),
    "knowledge-bottom has no effect on an admitted claim");
  const both=merge(a,b);
  assert.equal(knowledgeReading(both),"stable");
  assert.deepEqual(both.for,["source:a"]);
  assert.deepEqual(both.against,["source:b"]);
  const withMore=merge(both,c);
  assert.equal(knowledgeReading(withMore),"stable");
  assert.deepEqual(withMore.for,["source:a","source:c"]);
  assert.deepEqual(withMore.against,["source:b"]);
});

test("two-sided FOUR testimony and illocutionary authority are independent carriers", () => {
  // Identical words about different fully typed propositions may not be
  // conjoined as contradictory evidence under a single claim identity.
  const claimA = told({for:["testimony:A"]});
  const claimB = createSignClaim({
    subject:ref,predicate:"another-sense",object:ref,against:["testimony:B"],
  });
  assert.equal(claimA.ok,true);
  assert.equal(claimB.ok,true);
  assert.equal(conflateClaims(claimA.value,claimB.value).ok,false);
  assert.equal(knowledgeReading(claimA.value),"potential");
  assert.equal(knowledgeReading(claimB.value),"active");
  // A string claiming force or authorization is neither a fourth evidence
  // bit nor a competence warrant, and the schema does not admit it.
  assert.equal(told({force:"declare"}).ok,false);
  assert.equal(told({authority:"office:leader"}).ok,false);
  assert.equal(told({perlocution:"customer accepted"}).ok,false);
  assert.equal(told({against:["testimony:C"]}).ok,true,
    "explicit opposite evidence is valid even when one witness supports it");
});
