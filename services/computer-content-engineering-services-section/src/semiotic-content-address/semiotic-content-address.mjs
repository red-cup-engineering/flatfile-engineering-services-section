/**
 * Semiotic content address: the house name of a piece of content.
 *
 * A semiotic carrier is a JSON-shaped value whose strings and keys are NFC
 * text and whose numbers are finite (bigints and byte strings are also
 * admitted), so every I-JSON value (RFC 7493) has an address. Its address is the RFC 6920 ni: name of the RFC 8949 canonical
 * CBOR of its canonical form: canonicalize, encode, name.
 *
 * Two carriers coincide exactly when they have one address, that is, when
 * their canonical bytes are identical. This module states that relation once;
 * every layer above (SignCell's marks and cells, metrologic's opaque
 * witnesses, the renderers) reads coincidence from here.
 */
import { decodeCanonical, encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { sha256Bytes } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-sha256";

/**
 * Transform one semiotic JSON carrier into its canonical representation.
 *
 * Strings and text map keys are NFC-normalized. The allowed values are null,
 * booleans, finite numbers (which canonical CBOR writes as integers when they
 * are safe integers and otherwise as the shortest exact float), bigint values, byte strings, arrays, and plain
 * text-keyed objects. A key collision introduced by NFC normalization is
 * rejected, as is a cycle; a value shared at several places is admitted.
 */
export function canonicalizeSemioticJson(value) {
  let canonical;
  const pending = [{ source: value, place: (result) => { canonical = result; } }];
  const open = new Set();
  while (pending.length > 0) {
    const item = pending.pop();
    if (item.close) { open.delete(item.close); continue; }
    const { source, place } = item;
    if (typeof source === "string") { place(source.normalize("NFC")); continue; }
    if (Buffer.isBuffer(source) || source instanceof Uint8Array || source === null || typeof source === "boolean" || typeof source === "bigint") { place(source); continue; }
    if (typeof source === "number") {
      if (!Number.isFinite(source)) throw new TypeError("semiotic JSON numbers must be finite");
      place(source); continue;
    }
    if ((Array.isArray(source) || (source && typeof source === "object")) && open.has(source)) throw new TypeError("semiotic JSON must not be cyclic");
    if (Array.isArray(source)) {
      open.add(source); pending.push({ close: source });
      const result = new Array(source.length); place(result);
      for (let index = source.length - 1; index >= 0; index -= 1)
        pending.push({ source: source[index], place: (member) => { result[index] = member; } });
      continue;
    }
    if (source && Object.getPrototypeOf(source) === Object.prototype) {
      open.add(source); pending.push({ close: source });
      const result = {}; const members = [];
      for (const [key, member] of Object.entries(source)) {
        // A member whose value is undefined is absent, as JSON reads it.
        if (member === undefined) continue;
        const canonicalKey = key.normalize("NFC");
        if (Object.hasOwn(result, canonicalKey)) throw new TypeError(`semiotic JSON map keys collide after NFC normalization: ${canonicalKey}`);
        result[canonicalKey] = undefined; members.push([canonicalKey, member]);
      }
      place(result);
      for (let index = members.length - 1; index >= 0; index -= 1) {
        const [key, member] = members[index];
        pending.push({ source: member, place: (canonicalMember) => { result[key] = canonicalMember; } });
      }
      continue;
    }
    throw new TypeError(`unsupported semiotic JSON value ${Object.prototype.toString.call(source)}`);
  }
  return canonical;
}

/** A carrier's canonical form, frozen throughout: the value its address names, held so it cannot
 *  drift from that address. Byte strings are views, which cannot be frozen, and are left as is. */
export function canonicalCarrier(value) {
  const canonical = canonicalizeSemioticJson(value);
  const pending = [canonical];
  while (pending.length > 0) {
    const item = pending.pop();
    if (item === null || typeof item !== "object" || ArrayBuffer.isView(item) || Object.isFrozen(item)) continue;
    Object.freeze(item);
    for (const member of Object.values(item)) pending.push(member);
  }
  return canonical;
}

// A frozen carrier cannot change, so its bytes are encoded once and read back after: settling
// compares the same cells pairwise, and re-encoding them on every comparison is quadratic work.
const frozenBytes = new WeakMap();

/** The canonical CBOR bytes of a carrier's canonical form. Callers treat the bytes as read-only. */
export function semanticBytes(value) {
  const memo = value !== null && typeof value === "object" && Object.isFrozen(value);
  if (memo) {
    const cached = frozenBytes.get(value);
    if (cached !== undefined) return cached;
  }
  const bytes = encodeCanonical(canonicalizeSemioticJson(value));
  if (memo) frozenBytes.set(value, bytes);
  return bytes;
}

/** Canonical CBOR bytes back to the canonical carrier they encode. */
export function decodeSemantic(bytes) {
  return canonicalizeSemioticJson(decodeCanonical(bytes));
}

/** A carrier's canonical CBOR bytes together with their address, encoded once. */
export function semanticAddress(value) {
  const bytes = semanticBytes(value);
  return Object.freeze({ id: makeNiUri(bytes), bytes });
}

/** The semiotic content address of a carrier. */
export function semanticId(value) {
  return semanticAddress(value).id;
}

/** The SHA-256 digest a carrier's content address names, in lowercase hex, for records whose
 *  identities are hex digits. */
export function semanticHex(value) {
  return sha256Bytes(semanticBytes(value));
}

// Canonical CBOR gives text, numbers, booleans and null each a major type of its own and writes
// text as the UTF-8 of its NFC form, so for these the bytes agree exactly when the values do.
const isScalar = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);

/** Whether two carriers coincide: identical canonical CBOR bytes, so one content address. A
 *  value outside the semiotic carrier is refused, not judged. */
export function coincides(left, right) {
  if (typeof left === "string" && typeof right === "string") return left === right || left.normalize("NFC") === right.normalize("NFC");
  if (isScalar(left) && isScalar(right) && typeof left !== "string" && typeof right !== "string") {
    if (typeof left === "number" && !Number.isFinite(left)) semanticBytes(left);
    if (typeof right === "number" && !Number.isFinite(right)) semanticBytes(right);
    return left === right;
  }
  return semanticBytes(left).equals(semanticBytes(right));
}

/** The canonical bytes coincidence compares, as a key: carriers coincide exactly when their keys are equal. */
export const coincidenceKey = (value) => semanticBytes(value).toString("latin1");
