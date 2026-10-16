import test from "node:test";
import assert from "node:assert/strict";
import {
  addEvidenceRecords,
  readingOfEvidenceRecord,
  evidenceSidesOfReading,
  evidenceRecord,
  evidenceRecordOfFourCensus,
  evidenceRecordTopMass,
  fourKnowledgeCoverDelta,
  joinKnowledgeEvidenceRecords,
  joinTruthEvidenceRecords,
  meetKnowledgeEvidenceRecords,
  meetTruthEvidenceRecords,
} from "@red-cup-engineering/metrologic/articulation/predicating/positing/evidence-record";

test("evidence records retain independent positive and negative tallies", () => {
  const left = evidenceRecord(2, 5);
  const right = evidenceRecord(7, 3);
  assert.deepEqual(addEvidenceRecords(left, right), evidenceRecord(9, 8));
  assert.deepEqual(joinKnowledgeEvidenceRecords(left, right), evidenceRecord(7, 5));
  assert.deepEqual(meetKnowledgeEvidenceRecords(left, right), evidenceRecord(2, 3));
  assert.deepEqual(joinTruthEvidenceRecords(left, right), evidenceRecord(7, 3));
  assert.deepEqual(meetTruthEvidenceRecords(left, right), evidenceRecord(2, 5));
  assert.equal(evidenceRecordTopMass(left), 2);
});

test("evidence records project to the canonical four-valued carrier", () => {
  assert.equal(readingOfEvidenceRecord(evidenceRecord(0, 0)), "absurd");
  assert.equal(readingOfEvidenceRecord(evidenceRecord(1, 0)), "potential");
  assert.equal(readingOfEvidenceRecord(evidenceRecord(0, 1)), "active");
  assert.equal(readingOfEvidenceRecord(evidenceRecord(1, 1)), "stable");
  assert.deepEqual(evidenceSidesOfReading("stable"), ["for", "against"]);
  assert.deepEqual(evidenceRecordOfFourCensus({ absurd: 4, potential: 2, active: 3, stable: 5 }), evidenceRecord(7, 8));
});

test("FOUR knowledge covers are not the number of Record attestations", () => {
  const none = evidenceRecord(0,0), once = evidenceRecord(1,0);
  const many = evidenceRecord(10,0), counter = evidenceRecord(10,7);
  const first = fourKnowledgeCoverDelta(none,once);
  assert.equal(first.coverCount,1);
  assert.equal(first.from,"absurd");
  assert.equal(first.to,"potential");
  assert.equal(first.economicWit,"not-assayed-no-witness-or-border-receipt");
  const repeated = fourKnowledgeCoverDelta(once,many);
  assert.equal(repeated.coverCount,0,"nine extra positive records are no new FOUR covers");
  assert.deepEqual(repeated.recordIncrements,{pos:9,neg:0});
  assert.equal(fourKnowledgeCoverDelta(many,counter).coverCount,1);
  assert.equal(fourKnowledgeCoverDelta(counter,evidenceRecord(11,9)).coverCount,0);
});

test("bottom to both is two FOUR covers with no invented intermediate order", () => {
  const result = fourKnowledgeCoverDelta(evidenceRecord(0,0),evidenceRecord(4,8));
  assert.equal(result.coverCount,2);
  assert.equal(result.to,"stable");
  assert.equal(result.pathOrder,"undetermined");
  assert.deepEqual(result.recordIncrements,{pos:4,neg:8});
  assert.equal(result.economicWit,"not-assayed-no-witness-or-border-receipt");
});

test("non-monotone or untyped Record transitions cannot masquerade as witnessed covers", () => {
  assert.throws(() => fourKnowledgeCoverDelta(evidenceRecord(2,0),evidenceRecord(1,0)),RangeError);
  assert.throws(() => fourKnowledgeCoverDelta(evidenceRecord(1,3),evidenceRecord(1,0)),RangeError);
  assert.throws(() => fourKnowledgeCoverDelta({pos:0,neg:0},evidenceRecord(1,0)),TypeError);
  assert.throws(() => fourKnowledgeCoverDelta(evidenceRecord(0,0),{kind:"metrologic.evidenceRecord",pos:Infinity,neg:0}),TypeError);
});

test("finite Record grid retains the exact positivity-cover invariant", () => {
  let cases=0;
  for(let pos=0;pos<4;pos++)for(let neg=0;neg<4;neg++)
    for(let dp=0;dp<5;dp++)for(let dn=0;dn<5;dn++){
      const a=evidenceRecord(pos,neg),b=evidenceRecord(pos+dp,neg+dn);
      const reading=fourKnowledgeCoverDelta(a,b);
      const expected=Number(pos===0 && dp>0)+Number(neg===0 && dn>0);
      assert.equal(reading.coverCount,expected);
      assert.equal(reading.coverCount<=2,true);
      assert.equal(reading.recordIncrements.pos,dp);
      assert.equal(reading.recordIncrements.neg,dn);
      assert.equal(Object.isFrozen(reading.recordIncrements),true);
      cases++;
    }
  assert.equal(cases,400);
});
