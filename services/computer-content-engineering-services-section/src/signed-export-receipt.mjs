/** An export and its source bytes, bound to one accountable Ed25519 signer.
 * The receiver supplies the trusted public key and expected issuer independently.
 * A signature authenticates the issuer's claim; it does not establish that the
 * issuer had authority over the source records or that a service was delivered. */
import { createPublicKey } from "node:crypto";
import { makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { keyIdOf, privateSigningKey, publicSigningKey, signCanonicalBody, verifyCanonicalBody } from "./canonical-signature.mjs";

const KIND = "signstuff.signed-export-receipt";
const DOMAIN = "signstuff.signed-export-receipt.v1\n";
const keysAre = (value, names) => value !== null && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));
const nonempty = (value) => typeof value === "string" && value.length > 0 && value.trim() === value;
const octets = (value) => {
  if (!(value instanceof Uint8Array)) throw new TypeError("signed export requires bytes");
  return value;
};
const descriptor = ({ bytes, mediaType }) => {
  octets(bytes);
  if (!nonempty(mediaType)) throw new TypeError("signed export requires a media type");
  return Object.freeze({ content: makeNiUri(bytes), bytes: bytes.byteLength, mediaType });
};

/** Source artifacts are supplied as {bytes, mediaType}; their order is part of the signed claim. */
export function signExportReceipt({ exportBytes, exportMediaType, sourceArtifacts, issuer, issuedAt, privateKey, transformation }) {
  if (!nonempty(issuer) || !nonempty(issuedAt) || !Number.isFinite(Date.parse(issuedAt))) throw new TypeError("signed export requires an issuer and time");
  if (!Array.isArray(sourceArtifacts) || sourceArtifacts.length === 0) throw new TypeError("signed export requires source artifacts");
  const key = privateSigningKey(privateKey);
  const publicKey = createPublicKey(key);
  const body = Object.freeze({
    kind: KIND, version: 1, issuer, issuedAt,
    export: descriptor({ bytes: exportBytes, mediaType: exportMediaType }),
    sources: Object.freeze(sourceArtifacts.map(descriptor)),
    ...(transformation === undefined ? {} : { transformation }),
  });
  return Object.freeze({ ...body, signature: Object.freeze({
    algorithm: "Ed25519",
    keyId: keyIdOf(publicKey),
    value: signCanonicalBody(DOMAIN, body, key),
  }) });
}

/** Check exact source and export bytes against a separately trusted issuer/key. */
export function verifyExportReceipt({ exportBytes, sourceArtifacts, receipt, publicKey, expectedIssuer }) {
  const refuse = (reason) => Object.freeze({ ok: false, reason });
  try {
    if (!keysAre(receipt, ["kind", "version", "issuer", "issuedAt", "export", "sources", "signature"])
      && !keysAre(receipt, ["kind", "version", "issuer", "issuedAt", "export", "sources", "transformation", "signature"])) return refuse("malformed receipt or issuer");
    if (
      (Object.hasOwn(receipt, "transformation") && (receipt.transformation === null || typeof receipt.transformation !== "object" || Array.isArray(receipt.transformation)))
      || receipt.kind !== KIND || receipt.version !== 1 || !nonempty(expectedIssuer)
      || receipt.issuer !== expectedIssuer || !nonempty(receipt.issuedAt)
      || !Number.isFinite(Date.parse(receipt.issuedAt))
      || !keysAre(receipt.export, ["content", "bytes", "mediaType"])
      || !Array.isArray(receipt.sources) || receipt.sources.length === 0
      || !Array.isArray(sourceArtifacts) || receipt.sources.length !== sourceArtifacts.length
      || !keysAre(receipt.signature, ["algorithm", "keyId", "value"])
      || receipt.signature.algorithm !== "Ed25519" || !nonempty(receipt.signature.value)) return refuse("malformed receipt or issuer");
    const key = publicSigningKey(publicKey);
    if (keyIdOf(key) !== receipt.signature.keyId) return refuse("untrusted signer");
    if (!verifyNiUri(octets(exportBytes), receipt.export.content) || receipt.export.bytes !== exportBytes.byteLength
      || !nonempty(receipt.export.mediaType)) return refuse("export bytes differ");
    for (let index = 0; index < receipt.sources.length; index += 1) {
      const claim = receipt.sources[index];
      const source = sourceArtifacts[index];
      if (!keysAre(claim, ["content", "bytes", "mediaType"]) || !source || !nonempty(claim.mediaType)
        || source.mediaType !== claim.mediaType || !verifyNiUri(octets(source.bytes), claim.content)
        || source.bytes.byteLength !== claim.bytes) return refuse("source bytes differ");
    }
    const { signature, ...body } = receipt;
    if (!verifyCanonicalBody(DOMAIN, body, signature.value, key)) return refuse("signature does not verify");
    return Object.freeze({ ok: true, issuer: expectedIssuer, keyId: signature.keyId, export: receipt.export.content });
  } catch {
    return refuse("malformed receipt or key");
  }
}
