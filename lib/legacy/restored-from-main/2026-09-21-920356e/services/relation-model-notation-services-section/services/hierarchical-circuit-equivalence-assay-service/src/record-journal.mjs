import { createSemanticRecordJournal } from "@red-cup-engineering/eavt/semantic-record";

const OBJECT_KIND = "lenticule.hierarchical-circuit-equivalence-assay.journal-record";
const SUPPORT_ONLY = Object.freeze({ support: true, refutation: false });

/** Package-local custody; the assay has no ambient or remote journal authority. */
export function createHierarchicalCircuitEquivalenceRecordJournal({ root }) {
  const journal = createSemanticRecordJournal({ root, objectKind: OBJECT_KIND });
  return Object.freeze({
    ...journal,
    recordReceipt(receipt, recordedAt) {
      return journal.record({
        category: "hierarchical-circuit-equivalence-assay.receipt",
        record: receipt,
        recordedAt,
        charge: SUPPORT_ONLY,
      });
    },
  });
}
