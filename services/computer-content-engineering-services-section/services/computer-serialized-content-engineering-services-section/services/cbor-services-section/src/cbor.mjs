/** The house CBOR carrier, realized with native cbor2 wire primitives.
 * Finite numbers (negative zero becomes zero), uint64-range BigInts, well-formed
 * text without normalization, bytes, arrays and plain text-key objects.
 * Undefined object entries are absent. These are application rules, not the
 * whole RFC 8949 data model. Existing encoded bytes and NI identities survive.
 */
import { defaultEncodeOptions, writeBigInt, writeInt, writeUnknown, writeUint8Array } from "cbor2/encoder";
import { decode as decodeNative } from "cbor2/decoder";
import { Writer } from "cbor2/writer";
import { Tag } from "cbor2/tag";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { base64ToBytes, bytesCompare, bytesEqual, bytesToBase64, ownedBytes } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-bytes";

const OPTIONS = Object.freeze({ ...defaultEncodeOptions, simplifyNegativeZero: true, ignoreOriginalEncoding: true, ignoreGlobalTags: true });
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function unsigned(value) {
  const integer = typeof value === "bigint" ? value : BigInt(value);
  if (integer < 0n || integer > 0xffffffffffffffffn) fail("non-canonical-cbor", "CBOR argument is outside the CBOR uint64 profile");
  return integer;
}
function head(major, value) {
  const writer = new Writer();
  writeBigInt(unsigned(value), writer, OPTIONS);
  const bytes = Uint8Array.from(writer.read()); bytes[0] |= major << 5;
  return ownedBytes(bytes);
}
function textMap(pairs) {
  const keys = new Set();
  for (const [key] of pairs) {
    if (typeof key !== "string") fail("non-canonical-cbor", "CBOR codec map keys must be text strings");
    if (keys.has(key)) fail("non-canonical-cbor", `duplicate CBOR map key ${key}`);
    keys.add(key);
  }
  // DefineOwnProperty preserves __proto__ as data, never as prototype mutation.
  return Object.fromEntries(pairs.map(([key, value]) => [key, value]));
}
function encode(value) {
  const writer = new Writer(), ancestors = new Set(), stack = [{ value }];
  while (stack.length) {
    const item = stack.pop();
    if (item.exit) { ancestors.delete(item.value); continue; }
    if (item.bytes) { writer.write(item.bytes); continue; }
    const member = item.value;
    if (member instanceof Tag) fail("non-canonical-cbor", "CBOR tags are outside the supported CBOR codec profile");
    if (member instanceof Uint8Array) { writeUint8Array(member, writer); continue; }
    if (Array.isArray(member) || (member && Object.getPrototypeOf(member) === Object.prototype)) {
      if (ancestors.has(member)) fail("non-canonical-cbor", "cyclic CBOR carrier");
      ancestors.add(member); stack.push({ exit: true, value: member });
      if (Array.isArray(member)) {
        writeInt(member.length, writer, 4);
        for (let index = member.length - 1; index >= 0; index--) stack.push({ value: member[index] });
      } else {
        const entries = Object.entries(member).filter(([, entry]) => entry !== undefined)
          .map(([key, entry]) => ({ bytes: encode(key), value: entry }))
          .sort((left, right) => bytesCompare(left.bytes, right.bytes));
        writeInt(entries.length, writer, 5);
        for (let index = entries.length - 1; index >= 0; index--) {
          stack.push({ value: entries[index].value }); stack.push({ bytes: entries[index].bytes });
        }
      }
      continue;
    }
    if (typeof member === "number" && !Number.isFinite(member)) fail("non-canonical-cbor", "CBOR codec numbers must be finite");
    if (typeof member === "bigint") unsigned(member < 0n ? -1n - member : member);
    if (typeof member === "string" && !member.isWellFormed()) fail("non-canonical-cbor", "CBOR text string contains an unpaired Unicode surrogate");
    if (member !== null && !["boolean", "number", "bigint", "string"].includes(typeof member)) fail("non-canonical-cbor", `unsupported CBOR codec carrier value ${Object.prototype.toString.call(member)}`);
    writeUnknown(member, writer, OPTIONS);
  }
  return ownedBytes(writer.read());
}

/** Encode `value` as RFC 8949 core deterministic ("canonical") CBOR.
 * @param {*} value a boolean, null, finite number, bigint, string,
 *   Uint8Array, array, or plain object (recursively) — a a compatible value
 *   qualifies via the array branch, with no adaptation.
 * @returns {Uint8Array}
 */
export function encodeCanonical(value) { return encode(value); }

/** Encode one non-collection carrier through the canonical writer. */
export function encodeCanonicalScalar(value) {
  if (Array.isArray(value) || (value && Object.getPrototypeOf(value) === Object.prototype)) {
    fail("non-canonical-cbor", "canonical scalar cannot be a collection");
  }
  return encode(value);
}

/** Encode one definite-length canonical CBOR array header. */
export function encodeCanonicalArrayHeader(length) { return head(4, length); }

/** Decode a canonical CBOR byte string back into a value. Rejects any input
 *  that is structurally valid CBOR but is not itself in RFC 8949 core
 *  deterministic form (non-shortest arguments, unsorted map keys, trailing
 *  bytes, indefinite lengths, non-shortest floats, tags, duplicate keys, etc.).
 * @param {Uint8Array} source
 * @returns {*}
 */
export function decodeCanonical(source) {
  const bytes = Uint8Array.from(source);
  let value;
  try {
    value = decodeNative(bytes, { maxDepth: Infinity, ignoreGlobalTags: true,
      rejectStreaming: true, requirePreferred: true, rejectUndefined: true, preferBigInt: true,
      rejectSimple: true, createObject: textMap });
    // Decode wire integers as BigInt before selecting the public scalar type.
    // This preserves -2^53 as an integer without coercing actual wire floats.
    // The house carrier exposes byte strings as owned byte copies, including nested ones.
    const stack = [{ value, set: member => { value = member; } }];
    while (stack.length) {
      const item = stack.pop(), member = item.value;
      if (typeof member === "bigint" && member >= -9007199254740991n && member <= 9007199254740991n) { item.set(Number(member)); continue; }
      if (member instanceof Uint8Array) { item.set(ownedBytes(member)); continue; }
      if (Array.isArray(member) || (member && Object.getPrototypeOf(member) === Object.prototype)) {
        for (const key of Object.keys(member)) stack.push({ value: member[key], set: child => Object.defineProperty(member, key, { value: child, enumerable: true, configurable: true, writable: true }) });
      }
    }
  } catch (cause) { fail("non-canonical-cbor", `CBOR item is not in the supported deterministic profile: ${cause.message}`); }
  if (!bytesEqual(encode(value), bytes)) fail("non-canonical-cbor", "CBOR item is valid but not in RFC 8949 core deterministic form");
  return value;
}

/** True iff `left` and `right` encode to the same canonical CBOR bytes. */
export function canonicalEqual(left, right) { return bytesEqual(encode(left), encode(right)); }

/**
 * Name one canonical CBOR byte string: RFC 8949 core-deterministic bytes in,
 * the RFC 6920 SHA-256 `ni:` URI of those exact bytes out. Bytes that are not
 * already canonical are refused.
 */
export function canonicalCborToNiUri(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("canonical CBOR must be a Uint8Array");
  const canonical = Uint8Array.from(bytes);
  decodeCanonical(canonical);
  return makeNiUri(canonical);
}

/** {value} -> {base64}: the canonical CBOR of an admitted carrier value. */
export function encodeCbor(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { base64: bytesToBase64(encodeCanonical(request.value)) };
}

/** {base64} -> {value}: a canonical CBOR byte string decoded. */
export function decodeCbor(request) {
  if (typeof request?.base64 !== "string") throw new TypeError("base64 must be a string");
  return { value: decodeCanonical(base64ToBytes(request.base64)) };
}

/** {value} -> {uri}: the ni: name of a value's canonical CBOR encoding. */
export function deriveCborNi(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { uri: canonicalCborToNiUri(encodeCanonical(request.value)) };
}
