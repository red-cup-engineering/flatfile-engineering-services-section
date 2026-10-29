import type { ChargeValue, ChargeValueName, FourCensus } from "./bilattice-charge.mjs";
export type Evidence = "for" | "against";
export interface EvidenceRecord {
    readonly kind: "bilattice-charge.evidenceRecord";
    readonly pos: number;
    readonly neg: number;
}
export declare const evidenceNames: readonly Evidence[];
export declare function isEvidence(value: string): value is Evidence;
export declare const chargeValueNameOfEvidence: (evidence: Evidence) => ChargeValueName;
export declare function evidenceOfChargeValueName(name: ChargeValueName): readonly Evidence[];
export declare function evidenceRecord(pos: number, neg: number): EvidenceRecord;
export declare const addEvidenceRecords: (left: EvidenceRecord, right: EvidenceRecord) => EvidenceRecord;
export declare const joinKnowledgeEvidenceRecords: (left: EvidenceRecord, right: EvidenceRecord) => EvidenceRecord;
export declare const meetKnowledgeEvidenceRecords: (left: EvidenceRecord, right: EvidenceRecord) => EvidenceRecord;
export declare const joinTruthEvidenceRecords: (left: EvidenceRecord, right: EvidenceRecord) => EvidenceRecord;
export declare const meetTruthEvidenceRecords: (left: EvidenceRecord, right: EvidenceRecord) => EvidenceRecord;
export declare const chargeValueOfEvidenceRecord: (record: EvidenceRecord) => ChargeValue;
export declare const evidenceRecordTopMass: (record: EvidenceRecord) => number;
export declare const evidenceRecordOfFourCensus: (census: FourCensus) => EvidenceRecord;
