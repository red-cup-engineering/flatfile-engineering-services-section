// seal — synchronous AES-256-GCM sealing at rest, node:crypto only (this
// section runs on plain Node, never inside a Worker, so it has no reason to
// route through the async WebCrypto surface). Sealed form
// "v1.<iv base64url unpadded>.<ciphertext||tag base64url unpadded>" — the
// 16-byte GCM authentication tag is appended to the ciphertext, the same byte
// layout WebCrypto's `crypto.subtle.encrypt({ name: "AES-GCM" }, ...)`
// produces and `crypto.subtle.decrypt` expects — so values sealed by the
// Assist engine's WebCrypto module (src/crypto/seal.mjs there) open
// unchanged here, and vice versa.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const IV_BYTES = 12;
const KEY_BYTES = 32;
const TAG_BYTES = 16;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/u;

export class SealFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = "SealFormatError";
  }
}

export class SealDecryptError extends Error {
  constructor(message) {
    super(message);
    this.name = "SealDecryptError";
  }
}

function decodeKey(keyBase64) {
  if (typeof keyBase64 !== "string" || keyBase64.length === 0) {
    throw new TypeError("seal: keyBase64 must be a non-empty string");
  }
  const keyBytes = Buffer.from(keyBase64, "base64");
  if (keyBytes.length !== KEY_BYTES) {
    throw new TypeError(`seal: keyBase64 must decode to ${KEY_BYTES} bytes for AES-256-GCM, got ${keyBytes.length}`);
  }
  return keyBytes;
}

function decodeBase64UrlSegment(text, label) {
  if (typeof text !== "string" || !BASE64URL_PATTERN.test(text)) {
    throw new SealFormatError(`seal: openSecret ${label} segment is not valid base64url`);
  }
  return Buffer.from(text, "base64url");
}

/** Generate a fresh base64-encoded AES-256 key, suitable for the SEAL_KEY secret. */
export function generateKeyBase64() {
  return randomBytes(KEY_BYTES).toString("base64");
}

/** Encrypt `plaintext` under `keyBase64`, returning "v1.<iv>.<ciphertext||tag>" (base64url). */
export function sealSecret(plaintext, keyBase64, { aad } = {}) {
  if (typeof plaintext !== "string") throw new TypeError("seal: sealSecret requires plaintext to be a string");
  const key = decodeKey(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  if (aad !== undefined) cipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const sealed = Buffer.concat([ciphertext, tag]);
  return `v1.${iv.toString("base64url")}.${sealed.toString("base64url")}`;
}

/** Decrypt a "v1.<iv>.<ciphertext||tag>" string produced by sealSecret (or WebCrypto AES-GCM). */
export function openSecret(sealed, keyBase64, { aad } = {}) {
  if (typeof sealed !== "string") throw new TypeError("seal: openSecret requires sealed to be a string");
  const parts = sealed.split(".");
  if (parts.length !== 3) {
    throw new SealFormatError(`seal: openSecret expected format "v1.<iv>.<ciphertext>", got ${parts.length} segment(s)`);
  }
  const [version, ivPart, ciphertextPart] = parts;
  if (version !== "v1") throw new SealFormatError(`seal: openSecret does not recognize format version "${version}" (expected "v1")`);
  if (ivPart.length === 0 || ciphertextPart.length === 0) {
    throw new SealFormatError("seal: openSecret requires non-empty iv and ciphertext segments");
  }
  const iv = decodeBase64UrlSegment(ivPart, "iv");
  const combined = decodeBase64UrlSegment(ciphertextPart, "ciphertext");
  if (iv.length !== IV_BYTES) throw new SealFormatError(`seal: openSecret expected a ${IV_BYTES}-byte iv, got ${iv.length} bytes`);
  if (combined.length < TAG_BYTES) {
    throw new SealFormatError(`seal: openSecret ciphertext must be at least ${TAG_BYTES} bytes (auth tag), got ${combined.length} bytes`);
  }
  const key = decodeKey(keyBase64);
  const ciphertext = combined.subarray(0, combined.length - TAG_BYTES);
  const tag = combined.subarray(combined.length - TAG_BYTES);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    if (aad !== undefined) decipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    // AES-GCM's tag check fails identically for a wrong key and tampered data.
    throw new SealDecryptError("seal: openSecret failed to authenticate/decrypt (wrong key or corrupted/tampered data)");
  }
}

/** Seal a JSON value: the sealed form of its canonical JSON text. */
export function sealJson(value, keyBase64) {
  return sealSecret(JSON.stringify(value), keyBase64);
}

/** Open a sealed JSON value. */
export function openJson(sealed, keyBase64) {
  return JSON.parse(openSecret(sealed, keyBase64));
}

// --- sealing under a passphrase ---
// The key is scrypt(passphrase, salt) with N=2^15, r=8, p=1; the sealed form is a JSON envelope
// {v:1, kdf:"scrypt", N, r, p, salt, iv, tag, ct} (base64), carrying its KDF parameters so a
// later change of cost still opens older envelopes.
const SCRYPT = Object.freeze({ N: 2 ** 15, r: 8, p: 1, saltBytes: 16, maxmem: 128 * 1024 * 1024 });

function passphraseKey(passphrase, salt, N, r, p) {
  return scryptSync(passphrase, salt, KEY_BYTES, { N, r, p, maxmem: SCRYPT.maxmem });
}

/** Encrypt `plaintext` under a key derived from `passphrase`; returns the JSON envelope text. */
export function sealWithPassphrase(plaintext, passphrase) {
  if (typeof passphrase !== "string" || passphrase.length === 0) throw new TypeError("seal: empty passphrase");
  const salt = randomBytes(SCRYPT.saltBytes);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", passphraseKey(passphrase, salt, SCRYPT.N, SCRYPT.r, SCRYPT.p), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return JSON.stringify({
    v: 1, kdf: "scrypt", N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p,
    salt: salt.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ct: ct.toString("base64"),
  });
}

/** Decrypt an envelope produced by sealWithPassphrase. */
export function openWithPassphrase(envelope, passphrase) {
  let env;
  try {
    env = JSON.parse(envelope);
  } catch {
    throw new SealFormatError("seal: passphrase envelope is not JSON");
  }
  if (env.v !== 1 || env.kdf !== "scrypt") throw new SealFormatError(`seal: unsupported passphrase envelope (v=${String(env.v)}, kdf=${String(env.kdf)})`);
  const key = passphraseKey(passphrase, Buffer.from(env.salt, "base64"), env.N, env.r, env.p);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(env.iv, "base64"));
    decipher.setAuthTag(Buffer.from(env.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(env.ct, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new SealDecryptError("seal: wrong passphrase or corrupted envelope");
  }
}
