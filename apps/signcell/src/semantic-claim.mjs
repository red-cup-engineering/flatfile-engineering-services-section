/**
 * A typed predication is a SignCell cell: an ordered (subject, predicate, object) whose subject and
 * object are typed semantic references and whose predicate is a name, with the witnesses told for
 * and against it. Its reading is what that evidence shows (Valued.presence), or the value a join or
 * meet wrote beside it; it is never a field stated beside the triple, so no claim reads `potential`
 * without a witness having told it.
 */
import { admit } from "@red-cup-engineering/computer-data-services-section/type-system";
import { sidesOfReading } from "@red-cup-engineering/computer-data-services-section/four";
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

/** Read a stored claim. A carrier from before claims carried evidence (`kind: "sign.claim"` with a
 *  stated `reading`) is read as that reading told by `witness`, the record that stated it. */
export function readSignClaim(input, witness) {
  if (input?.kind !== "sign.claim") return createSignClaim(input);
  const { kind: _kind, reading, ...triple } = input;
  let sides;
  try { sides = sidesOfReading(reading); } catch { return refused("a stored claim's reading must be a reading of FOUR"); }
  if (witness === undefined && (sides[0] || sides[1])) return refused("a stored claim's reading needs the witness that told it");
  return createSignClaim({ ...triple, for: sides[0] ? [witness] : [], against: sides[1] ? [witness] : [] });
}

/** The tellings of one claim together (Valued.joinK): every witness of either kept. */
export function conflateClaims(left, right) {
  if (!sameCell(left, right)) return refused("only claims with the same subject, predicate, and object may be conflated");
  return accepted(merge(left, right));
}
