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
