import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { canonical } from "@red-cup-engineering/json-services-section";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

export const privateSigningKey = (value) => {
  const key = typeof value === "string" ? createPrivateKey(value) : value;
  if (key?.asymmetricKeyType !== "ed25519") throw new TypeError("Ed25519 private key required");
  return key;
};
export const publicSigningKey = (value) => {
  const key = typeof value === "string" ? createPublicKey(value) : value;
  if (key?.asymmetricKeyType !== "ed25519") throw new TypeError("Ed25519 public key required");
  return key;
};
export const keyIdOf = (key) => makeNiUri(key.export({ type: "spki", format: "der" }));
const bytesOf = (domain, body) => Buffer.from(domain + canonical(body), "utf8");
export const signCanonicalBody = (domain, body, key) => sign(null, bytesOf(domain, body), key).toString("base64url");
export function verifyCanonicalBody(domain, body, value, key) {
  const bytes = Buffer.from(value, "base64url");
  return bytes.length === 64 && bytes.toString("base64url") === value
    && verify(null, bytesOf(domain, body), key, bytes);
}
