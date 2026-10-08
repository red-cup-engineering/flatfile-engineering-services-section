/** Browser-safe byte helpers over Uint8Array (Node's Buffer is a Uint8Array, so Buffers pass).
 *
 * Content-address bytes are plain Uint8Array values: nothing here imports a Node module or
 * names Buffer's methods. `ownedBytes` is the single place a host byte type is chosen: Node
 * callers of the content address have always received Buffers and call Buffer methods on them,
 * so on a host that has Buffer the copy is a Buffer (a Uint8Array subclass); elsewhere it is a
 * plain Uint8Array. */

const HEX = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, "0"));
const CHUNK = 0x2000;

/** An owned copy of `bytes`, in the host's byte type (Buffer where it exists, else Uint8Array). */
export const ownedBytes = (bytes) => (globalThis.Buffer ? globalThis.Buffer.from(bytes) : Uint8Array.from(bytes));

/** Lowercase hex of bytes. */
export function bytesToHex(bytes) {
  let text = "";
  for (let index = 0; index < bytes.length; index += 1) text += HEX[bytes[index]];
  return text;
}

/** One character per byte (code units 0-255): a string key that is equal exactly when the bytes are. */
export function bytesToLatin1(bytes) {
  let text = "";
  for (let index = 0; index < bytes.length; index += CHUNK) text += String.fromCharCode.apply(null, bytes.subarray(index, index + CHUNK));
  return text;
}

/** Whether two byte strings hold the same bytes. */
export function bytesEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

/** Lexicographic order of two byte strings: negative, zero or positive. */
export function bytesCompare(left, right) {
  const shared = Math.min(left.length, right.length);
  for (let index = 0; index < shared; index += 1) if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

/** The concatenation of byte strings, as a plain Uint8Array. */
export function concatBytes(...parts) {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

/** The UTF-8 bytes of text. */
export const utf8Bytes = (text) => new TextEncoder().encode(text);

/** Standard padded Base64 of bytes. */
export const bytesToBase64 = (bytes) => btoa(bytesToLatin1(bytes));

/** Bytes of standard padded Base64 text. */
export const base64ToBytes = (text) => Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
