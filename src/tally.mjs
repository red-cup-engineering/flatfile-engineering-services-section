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
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { knowledgeJoinAll, readingOfSides } from "./four.mjs";

/** The fields a release and an admission must agree on, by default. */
export const TALLY_FIELDS = Object.freeze(["caseId", "resources", "paths", "digests"]);

const present = (half) => half !== undefined && half !== null;

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
  const evidence = fields.map((field) => [field, canonicalJson(release[field] ?? null) === canonicalJson(admission[field] ?? null)]);
  const namesEachOther = release.actor !== undefined && release.actor !== release.counterparty
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
