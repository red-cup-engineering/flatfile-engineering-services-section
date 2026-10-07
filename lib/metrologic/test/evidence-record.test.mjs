import test from "node:test";
import assert from "node:assert/strict";
import {
  addEvidenceRecords,
  readingOfEvidenceRecord,
  evidenceSidesOfReading,
  evidenceRecord,
  evidenceRecordOfFourCensus,
  evidenceRecordTopMass,
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
