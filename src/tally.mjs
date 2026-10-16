/**
 * tally — the border-reconciled form of the wit: a release receipt held by one counterparty and an
 * admission receipt held by the other, agreeing on the case, the exact resource set, the paths and
 * the content digests. Transfer settles when, and only when, the halves match; a single half is a
 * claim awaiting its counterpart, and a mismatched pair is a dispute, not a transfer (the monetary
 * economics section's tally and tally credit; the Exchequer's split tally stick).
 *
 * Each compared field is evidence about the pair: a field the halves agree on is told for it, one
 * they disagree on is told against it, and the halves must name each other as counterparties. The
 * pair's reading is the knowledge join of that evidence, so a dispute is held in FOUR (contested
 * when some fields agree and others do not, denied when none do) rather than discarded.
 * A structural match does not itself authenticate either actor or constitute a separate ACK/ATT.
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { knowledgeJoinAll, readingOfSides } from "./four.mjs";

/** The fields a release and an admission must agree on, by default. */
export const TALLY_FIELDS = Object.freeze(["caseId", "resources", "paths", "digests"]);

const present = (half) => half !== undefined && half !== null;
const isReceipt = (half) => half !== null && typeof half === "object"
  && !Array.isArray(half) && Object.getPrototypeOf(half) === Object.prototype;
const party = (half, field) => Object.hasOwn(half, field)
  && typeof half[field] === "string" && half[field].trim().length > 0;

// No empty or absent placeholder is settlement evidence. Keep the payload's
// original JSON shape (a set/list, map or reference) for the existing JCS
// comparator; do not fabricate a receipt by coalescing missing fields to null.
const specified = (half, field) => {
  if (!Object.hasOwn(half, field)) return false;
  const value = half[field];
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return Object.keys(value).length > 0;
  return false;
};

function admissionFields(fields) {
  if (!Array.isArray(fields) || fields.some(field => typeof field !== "string" || field.trim().length === 0)
      || new Set(fields).size !== fields.length || fields.includes("counterparties")
      || !TALLY_FIELDS.every(field => fields.includes(field))) {
    throw new TypeError("tally: fields must uniquely include caseId, resources, paths and digests");
  }
  return fields;
}

/** Reconcile a release and an admission half (either may be absent) on `fields`. */
export function tally({ release, admission, fields = TALLY_FIELDS } = {}) {
  if (!present(release) || !present(admission)) {
    return Object.freeze({
      status: present(release) || present(admission) ? "claim" : "absent",
      reading: "absurd",
      mismatches: Object.freeze([]),
      awaiting: present(release) ? "admission" : present(admission) ? "release" : "both",
    });
  }
  if (!isReceipt(release) || !isReceipt(admission)) {
    throw new TypeError("tally: release and admission must be plain receipt objects");
  }
  const required = admissionFields(fields);
  const evidence = required.map((field) => [field,
    specified(release, field) && specified(admission, field)
      && (field !== "caseId" || (typeof release[field] === "string" && typeof admission[field] === "string"))
      && canonicalJson(release[field]) === canonicalJson(admission[field])
  ]);
  // Reciprocal names are necessary for structural reconciliation, not proof
  // of signatures, office authority or independently received acknowledgment.
  const namesEachOther = party(release, "actor") && party(release, "counterparty")
    && party(admission, "actor") && party(admission, "counterparty")
    && release.actor !== admission.actor
    && release.actor === admission.counterparty && admission.actor === release.counterparty;
  evidence.push(["counterparties", namesEachOther]);
  const reading = knowledgeJoinAll(evidence.map(([, agrees]) => readingOfSides("knowledge", agrees, !agrees)));
  return Object.freeze({
    status: reading === "potential" ? "settled" : "dispute",
    reading,
    mismatches: Object.freeze(evidence.filter(([, agrees]) => !agrees).map(([field]) => field)),
    awaiting: null,
  });
}
