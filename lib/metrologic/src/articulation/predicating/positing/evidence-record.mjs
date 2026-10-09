import { readingOfSides, sidesOfReading, readingFamilies, record, recordAdd, recordJoinK, recordMeetK, recordJoinT, recordMeetT, readingOfRecord, topMass } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** A tally of positive and negative evidence, the carrier every evidence-record operation takes. */
export const EvidenceRecordSchema = {
    type: "object",
    required: ["kind", "pos", "neg"],
    properties: {
        kind: { const: "metrologic.evidenceRecord" },
        pos: { type: "integer", minimum: 0 },
        neg: { type: "integer", minimum: 0 },
    },
    additionalProperties: false,
};
export const evidenceNames = Object.freeze(["for", "against"]);
const KIND = "metrologic.evidenceRecord";
const tagged = (r) => Object.freeze({ kind: KIND, pos: r.pos, neg: r.neg });
export function isEvidence(value) {
    return evidenceNames.includes(value);
}
/** The reading of one told side. */
export const readingOfEvidenceSide = (side) => readingOfSides("knowledge", side === "for", side !== "for");
/** The sides a reading tells, by name. */
export function evidenceSidesOfReading(name) {
    if (!readingFamilies.knowledge.includes(name))
        throw new TypeError("not a knowledge reading: " + JSON.stringify(name));
    const [told, against] = sidesOfReading(name);
    return Object.freeze([...(told ? ["for"] : []), ...(against ? ["against"] : [])]);
}
function evidenceCount(value, label) {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new TypeError(label + " must be a nonnegative safe integer");
    return value;
}
export function evidenceRecord(pos, neg) {
    return tagged(record(evidenceCount(pos, "positive evidence tally"), evidenceCount(neg, "negative evidence tally")));
}
export const addEvidenceRecords = (left, right) => tagged(recordAdd(left, right));
export const joinKnowledgeEvidenceRecords = (left, right) => tagged(recordJoinK(left, right));
export const meetKnowledgeEvidenceRecords = (left, right) => tagged(recordMeetK(left, right));
export const joinTruthEvidenceRecords = (left, right) => tagged(recordJoinT(left, right));
export const meetTruthEvidenceRecords = (left, right) => tagged(recordMeetT(left, right));
/** The knowledge reading of a tally: which sides have any evidence. */
export const readingOfEvidenceRecord = (r) => readingOfRecord(r, "knowledge");
export const evidenceRecordTopMass = (r) => topMass(r);
export const evidenceRecordOfFourCensus = (census) => evidenceRecord(census.potential + census.stable, census.active + census.stable);
