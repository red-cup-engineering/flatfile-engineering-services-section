import { validateRecord } from "./record-types.mjs";
import { validateWitness } from "./witness.mjs";
import { FOUR, four, joinKnowledgeWire } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// Register C (design spec S5C): institution.md's sigma_t/Delta_t double
// settlement, hand-mirroring pymetrologic.quartet's Corner/CommutingPair
// math over the same four-element knowledge lattice four.mjs's FOUR
// already is — PyMetroLogic is not importable from JS. sigma_t and Delta_t
// are the join-toward-a-pole nuclei (sigma toward FOUR.true, Delta toward
// FOUR.false); they commute because their poles act on independent
// coordinates. What is FARS-specific is not this machinery but what feeds
// it: sigmaHolds/deltaHolds, one bit each, computed once per record below.

function eqFour(a, b) {
  return a.positiveEvidence === b.positiveEvidence && a.negativeEvidence === b.negativeEvidence;
}

function joinNucleus(target) {
  return (value) => joinKnowledgeWire(value, target);
}

export const SIGMA_CLOSURE = joinNucleus(FOUR.true);
export const DELTA_CLOSURE = joinNucleus(FOUR.false);

export const PAIR = {
  f: SIGMA_CLOSURE,
  g: DELTA_CLOSURE,
  square(a) { return [this.f(this.g(a)), this.g(this.f(a))]; },
  commutes(elements, eq) { return elements.every((a) => eq(...this.square(a))); },
};

const CORNER_OF_STATUS = { "false,false": "absurd", "true,false": "potential", "false,true": "active", "true,true": "stable" };
const CORNER_OP = {
  absurd: (a) => a,
  potential: (a) => PAIR.f(a),
  active: (a) => PAIR.g(a),
  stable: (a) => PAIR.f(PAIR.g(a)),
};
const ELEMENTS = [FOUR.neither, FOUR.true, FOUR.false, FOUR.both];

export const PARTITION = Object.fromEntries(
  Object.keys(CORNER_OP).map((corner) => [corner, ELEMENTS.filter((x) => eqFour(CORNER_OP[corner](x), x))]),
);

export const DischargeState = Object.freeze({
  OPERATIVE: "operative",
  SAT_SHADOW: "sat_shadow",
  TR_SHADOW: "tr_shadow",
  FREE_SHADOW: "free_shadow",
});

const CORNER_TO_STATE = { stable: DischargeState.OPERATIVE, potential: DischargeState.SAT_SHADOW, active: DischargeState.TR_SHADOW, absurd: DischargeState.FREE_SHADOW };

export const TERMINAL_TRANSITIONS = new Set(["revocation", "expiry", "reinstatement", "supersession"]);

// sigma_t's citation fields: the backward-facing references a record's own
// recognition depends on. Forward-facing fields are Delta's business.
const SIGMA_CITATION_FIELDS = {
  Observation: ["witness_id"],
  CorrectionRecord: ["target"],
  StatusEvent: ["target", "supersedes"],
  OfficerInstallation: ["office", "authorizing_act"],
  Session: ["office"],
};

function validates(record) {
  try {
    if (record.type === "Witness") validateWitness(record);
    else validateRecord(record);
  } catch {
    return false;
  }
  return true;
}

function citedIds(record) {
  return (SIGMA_CITATION_FIELDS[record.type] ?? []).map((field) => record[field]);
}

export function sigmaHolds(record, records, witnesses = []) {
  if (!validates(record)) return false;
  const known = new Set([...records, ...witnesses].filter((r) => "id" in r).map((r) => r.id));
  return citedIds(record).every((cited) => cited === null || cited === undefined || known.has(cited));
}

function statusEventDelta(record, recordsById) {
  if (!TERMINAL_TRANSITIONS.has(record.transition)) return false;
  const successor = record.successor;
  return successor === null || successor === undefined || recordsById.has(successor);
}

function witChainClosed(recordId, witnesses) {
  let folded = FOUR.neither;
  for (const witness of witnesses) {
    if (witness.target !== recordId) continue;
    const fourAfter = witness.four_after;
    if (fourAfter) folded = joinKnowledgeWire(folded, four(fourAfter[0], fourAfter[1]));
  }
  return eqFour(folded, FOUR.both);
}

export function deltaHolds(record, records, witnesses = []) {
  if (record.type === "StatusEvent") {
    const recordsById = new Set(records.filter((r) => "id" in r).map((r) => r.id));
    return statusEventDelta(record, recordsById);
  }
  if (record.type === "CorrectionRecord") {
    return records.filter((r) => "id" in r).some((r) => r.id === record.replacement);
  }
  return witChainClosed(record.id, witnesses);
}

export function discharge(record, records, witnesses = []) {
  const x = four(sigmaHolds(record, records, witnesses), deltaHolds(record, records, witnesses));
  const sigmaFixed = eqFour(PAIR.f(x), x);
  const deltaFixed = eqFour(PAIR.g(x), x);
  return CORNER_TO_STATE[CORNER_OF_STATUS[`${sigmaFixed},${deltaFixed}`]];
}


