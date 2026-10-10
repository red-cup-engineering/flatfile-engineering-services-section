/** Exact content bytes claimed by one Ed25519 signer for a named purpose.
 * The verifier obtains the trusted key and issuer independently. */
import { createPublicKey } from "node:crypto";
import { makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { keyIdOf, privateSigningKey, publicSigningKey, signCanonicalBody, verifyCanonicalBody } from "./canonical-signature.mjs";

const KIND = "computer-content.signed-content-claim";
// The kind before the 2026-10-04 rename (SignCell, SignChain, SignGraph and SignCraft are apps of their
// layers' sections): claims signed under it are carried and verify under their own domain.
const DOMAINS = Object.freeze({
  [KIND]: "computer-content.signed-content-claim.v1\n",
  "signstuff.signed-content-claim": "signstuff.signed-content-claim.v1\n",
});
const named = (value) => typeof value === "string" && value.length > 0 && value.trim() === value;
const shape = (value, names) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));
const refuse = (reason) => Object.freeze({ ok: false, reason });

export function signContentClaim({ bytes, mediaType, purpose, issuer, issuedAt, privateKey }) {
  if (!(bytes instanceof Uint8Array) || ![mediaType, purpose, issuer, issuedAt].every(named)
    || !Number.isFinite(Date.parse(issuedAt))) throw new TypeError("content claim requires bytes, media type, purpose, issuer and time");
  const key = privateSigningKey(privateKey);
  const body = Object.freeze({ kind: KIND, version: 1, purpose, issuer, issuedAt,
    content: Object.freeze({ uri: makeNiUri(bytes), bytes: bytes.byteLength, mediaType }) });
  return Object.freeze({ ...body, signature: Object.freeze({ algorithm: "Ed25519", keyId: keyIdOf(createPublicKey(key)),
    value: signCanonicalBody(DOMAINS[KIND], body, key) }) });
}

export function verifyContentClaim({ bytes, claim, publicKey, expectedIssuer, expectedPurpose, expectedMediaType }) {
  try {
    if (!(bytes instanceof Uint8Array) || !shape(claim, ["kind", "version", "purpose", "issuer", "issuedAt", "content", "signature"])
      || !Object.hasOwn(DOMAINS, claim.kind) || claim.version !== 1 || ![expectedIssuer, expectedPurpose, expectedMediaType].every(named)
      || claim.issuer !== expectedIssuer || claim.purpose !== expectedPurpose
      || !named(claim.issuedAt) || !Number.isFinite(Date.parse(claim.issuedAt))
      || !shape(claim.content, ["uri", "bytes", "mediaType"]) || claim.content.mediaType !== expectedMediaType
      || claim.content.bytes !== bytes.byteLength || !verifyNiUri(bytes, claim.content.uri)
      || !shape(claim.signature, ["algorithm", "keyId", "value"])
      || claim.signature.algorithm !== "Ed25519" || !named(claim.signature.value)) return refuse("malformed or mismatched content claim");
    const key = publicSigningKey(publicKey);
    if (keyIdOf(key) !== claim.signature.keyId) return refuse("untrusted signer");
    const { signature, ...body } = claim;
    if (!verifyCanonicalBody(DOMAINS[claim.kind], body, signature.value, key)) return refuse("invalid signature");
    return Object.freeze({ ok: true, issuer: claim.issuer, content: claim.content.uri, keyId: claim.signature.keyId });
  } catch {
    return refuse("malformed content claim or key");
  }
}
