/**
 * A typed predication is a SignCell cell: an ordered (subject, predicate, object) whose subject and
 * object are typed semantic references and whose predicate is a name, with the witnesses told for
 * and against it. Its reading is what that evidence shows (Valued.presence), or the value a join or
 * meet wrote beside it; it is never a field stated beside the triple, so no claim reads `potential`
 * without a witness having told it.
 */
import { admit } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { cell, merge, sameCell } from "./cell.mjs";
import { semanticClaimType } from "./semantic-carriers.mjs";

const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (message) => Object.freeze({ ok: false, refusal: Object.freeze({ code: "invalid-claim", message }) });
const reference = (value) => Object.freeze({ id: value.id, type: value.type });

/** Admit one typed predication with its evidence (none by default). */
export function createSignClaim(input) {
  const candidate = input && typeof input === "object" ? { for: [], against: [], ...input } : input;
  const admitted = admit(semanticClaimType, candidate);
  if (!admitted.ok) return refused("subject and object must be typed semantic references, predicate a nonempty name, and evidence its for and against witnesses");
  try {
    return accepted(cell(reference(candidate.subject), candidate.predicate, reference(candidate.object), { for: candidate.for, against: candidate.against, value: candidate.value }));
  } catch (error) { return refused(error instanceof Error ? error.message : String(error)); }
}

/** Admit a persisted claim exactly as a SignCell carrier. Historical sign.claim
 * records must be migrated once at custody, with their original witnesses;
 * do not synthesize evidence from a stored reading during normal reads. */
export function readSignClaim(input) {
  return createSignClaim(input);
}

/** The tellings of one claim together (Valued.joinK): every witness of either kept. */
export function conflateClaims(left, right) {
  if (!sameCell(left, right)) return refused("only claims with the same subject, predicate, and object may be conflated");
  return accepted(merge(left, right));
}
