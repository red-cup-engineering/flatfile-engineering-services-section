/**
 * The address record of raw bytes: their RFC 6920 SHA-256 name with the size and media type they
 * were received as. The bytes are named exactly as given, never normalized; provenance rides beside
 * the name and never changes it.
 */
import { isNiUri, makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError("content bytes must be Uint8Array or ArrayBuffer");
}

export function addressContent(bytes, {
  mediaType = "application/octet-stream",
  source = undefined,
} = {}) {
  const admitted = bytesOf(bytes);
  if (typeof mediaType !== "string" || mediaType.length === 0) {
    throw new TypeError("mediaType must be non-empty text");
  }

  const record = {
    kind: "semiotic-content.raw-carrier-address",
    version: 1,
    algorithm: "sha-256",
    size: admitted.byteLength,
    mediaType,
    ni: makeNiUri(admitted),
  };

  if (source !== undefined) {
    if (source === null || typeof source !== "object" || Array.isArray(source)) {
      throw new TypeError("source must be an object when supplied");
    }
    record.source = Object.freeze(structuredClone(source));
  }

  return Object.freeze(record);
}

export function verifyContentAddress(bytes, record) {
  if (record === null || typeof record !== "object") return false;
  const admitted = bytesOf(bytes);
  if (record.kind !== "semiotic-content.raw-carrier-address") return false;
  if (record.version !== 1 || record.algorithm !== "sha-256") return false;
  if (record.size !== admitted.byteLength) return false;
  if (typeof record.mediaType !== "string" || record.mediaType.length === 0) return false;
  if (!isNiUri(record.ni)) return false;
  return verifyNiUri(admitted, record.ni);
}
