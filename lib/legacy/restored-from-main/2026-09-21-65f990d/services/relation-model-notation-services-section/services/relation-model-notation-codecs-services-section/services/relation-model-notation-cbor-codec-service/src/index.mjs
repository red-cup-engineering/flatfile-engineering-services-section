/**
 * Canonical carrier codec for Relation Model Notation.
 *
 * This owns exactly the carrier crossing: semiotic JSON normalization,
 * RFC 8949 canonical CBOR, and the RFC 6920 NI name of those bytes. It does
 * not type, evaluate, admit, or otherwise interpret an RMN term.
 */
import { canonicalizeSemioticJson } from "../../../../../../../apps/computer-data-engine/src/identity/index.mjs";
import { decodeCanonical, encodeCanonical } from "../../../../../../../apps/computer-data-engine/src/identity/index.mjs";
import { canonicalCborToNiUri } from "../../../../../../../apps/computer-data-engine/src/identity/index.mjs";

export const normalizeRmnCarrier = canonicalizeSemioticJson;

export function semanticBytes(value) {
  return encodeCanonical(normalizeRmnCarrier(value));
}

export function decodeSemantic(bytes) {
  return normalizeRmnCarrier(decodeCanonical(bytes));
}

export function semanticId(value) {
  return canonicalCborToNiUri(semanticBytes(value));
}
