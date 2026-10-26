// L-Space: marks and the relations between them, each named by its content address.
//
// A mark is any canonical JSON value; its address is the semiotic content address of that value
// (computer-content-address-engineering-services-section's carrier law), so the same value has the same address
// in every reader, store and package that uses the law. A relation is itself a mark: the value
// {relating: [address, ...]} — an ordered tuple of addresses, of any arity, whose members may be marks or other
// relations. Relations carry no truth value, polarity or evidence; those are later readings over them.
import { canonicalizeSemioticJson, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

/** Whether `value` is a semiotic content address. */
export const isAddress = (value) => typeof value === "string" && NI.test(value);

/** The address of a value under the carrier law. */
export const addressOf = (value) => semanticId(value);

/** A mark: a canonical value and its address. */
export function mark(value) {
  const canonical = canonicalizeSemioticJson(value);
  return Object.freeze({ address: semanticId(canonical), value: canonical });
}

/** A relation among addressed marks, in order; it is a mark whose value is {relating: addresses}. */
export function relating(...addresses) {
  if (addresses.length < 2) throw new RangeError("a relation relates at least two addresses");
  for (const address of addresses) if (!isAddress(address)) throw new TypeError(`not an address: ${address}`);
  return mark({ relating: addresses });
}

/** The addresses a relation value relates, or null when the value is not a relation. */
export function relatedBy(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "relating" || !Array.isArray(value.relating)) return null;
  return value.relating.length >= 2 && value.relating.every(isAddress) ? value.relating : null;
}

/**
 * A reading's own vocabulary: the mark a reader uses for a structural role (a body, a location, a list item),
 * kept apart from the plain string marks that sources themselves use as keys.
 */
export const role = (reading, name) => mark({ reading, role: name });
