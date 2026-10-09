import { toCount, members } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { chuSpaceOfMatrix, extension } from "../chu.mjs";
import { knowledgeMeetReading, negateReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
// A bare articulated (token, claim) pair with no negative evidence settles to "potential" — mere
// utterance is evidence FOR, never evidence against .
// This is what `settle(posit(predicate(articulate(['token', 'memberOf']))))` always evaluated to (an
// evidence-free reading: its own evidence was empty, since the utterance carried none); the descent
// itself now lives in SignCraft (the settling engine), so the floor's settled member reading is named
// directly rather than re-derived through it.
const MEMBER = "potential";
const BOUNDARY = knowledgeMeetReading(MEMBER, negateReading(MEMBER));
const tokenOf = (n) => `#${toCount(n)}`;

/**
 * The number AS a Chu space over FOUR: its `∈` claim over the universe n+1 = {0,…,n}, with each member
 * carrying the floor's SETTLED member reading (potential) and the boundary n carrying the REACHED reading
 * (absurd). `extension` then reads the set back off it; for zero the lone boundary reached absurd, so it
 * is empty.
 * @param {object} n @returns {object} a SignChain Chu space
 */
export function asExtension(n) {
  const universe = [...members(n), n]; // {0,…,n−1} members, plus the open boundary n
  const matrix = {};
  for (const x of members(n)) matrix[tokenOf(x)] = { "∈": MEMBER };
  matrix[tokenOf(n)] = { "∈": BOUNDARY };
  return chuSpaceOfMatrix(universe.map(tokenOf), ["∈"], matrix, { absent: BOUNDARY });
}

/** The tokens whose membership settles to potential — n's extension, read through the floor. |extensionOf(n)| = n. */
export const extensionOf = (n) => extension(asExtension(n), "∈");

