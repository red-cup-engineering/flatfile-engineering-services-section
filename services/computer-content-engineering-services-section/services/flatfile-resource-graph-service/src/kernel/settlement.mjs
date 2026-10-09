import { SettlingMonotonicityViolation, settlementAlgebra } from "@red-cup-engineering/metrologic/settlement";
import { four, joinKnowledgeWire } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// sigma_t — the knowledge-join settling algebra over SignChain's wire FOUR: a settling is a finite
// assignment index -> Four (one section of one fiber), and metrologic's settlement algebra derives
// merge, settle, the monotonicity gates and the per-cell tracker from that cell algebra alone.
const fourSettlement = settlementAlgebra({
  join: joinKnowledgeWire,
  equal: (a, b) => a.positiveEvidence === b.positiveEvidence && a.negativeEvidence === b.negativeEvidence,
  bottom: four(false, false),
});

export { SettlingMonotonicityViolation };
export const {
  merge: mergeSettling,
  mergeAll: mergeAllSettlings,
  settle,
  orbitMonotone,
  assertSettlingMonotone,
  guardSettlingMonotone,
  CellSettlement,
} = fourSettlement;
