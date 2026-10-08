import { canonicalizeSemioticJson } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

// canonicalizeSemioticJson NFC-normalizes strings and keys, rejects
// non-safe-integer numbers, and rejects NFC key collisions — but it
// preserves insertion order. Sort object keys recursively so that two
// logically identical bodies constructed with different key order digest
// to the same identity.
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortKeys(value[key]);
    return sorted;
  }
  return value;
}

// NFC-normalize, sort keys, reject unsafe numbers — the same canonical
// form both identity() below and kernel/replay.mjs's serializeState()
// serialize to compact JSON, so any two callers who canonicalize the
// same logical value always land on the same bytes.
export function canonicalize(value) {
  return sortKeys(canonicalizeSemioticJson(value));
}

// Content-derived identity: canonicalize, serialize to compact JSON, and
// name the SHA-256 digest of the UTF-8 bytes as an RFC 6920 ni: URI.
export function identity(value) {
  const bytes = Buffer.from(JSON.stringify(canonicalize(value)), "utf8");
  const uri = makeNiUri(bytes);
  if (!verifyNiUri(bytes, uri)) throw new Error(`computed ni: URI does not verify against its own bytes: ${uri}`);
  return uri;
}

// A record's id is never part of what identifies it.
export function identityOfRecord(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new TypeError("record body must be an object");
  const { id, ...rest } = body;
  return identity(rest);
}


