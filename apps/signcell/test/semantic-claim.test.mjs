import assert from "node:assert/strict";
import test from "node:test";
import { createSignClaim, conflateClaims } from "../src/semantic-claim.mjs";

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
