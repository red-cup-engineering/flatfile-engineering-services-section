// Synchronous node:crypto AES-256-GCM sealing. Mirrors the Assist engine's
// WebCrypto seal.mjs test suite (personal-intelligence-systems-services-section
// /test/seal.test.mjs) so every behaviour asserted there holds here too, plus a
// cross-implementation fixture proving both modules produce/consume the same
// "v1.<iv>.<ciphertext||tag>" byte layout.
import assert from "node:assert/strict";
import test from "node:test";
import {
  sealSecret,
  openSecret,
  sealJson,
  openJson,
  generateKeyBase64,
  SealFormatError,
  SealDecryptError,
} from "../src/seal.mjs";

test("sealSecret/openSecret round-trip preserves plaintext", () => {
  const key = generateKeyBase64();
  const sealed = sealSecret("super-secret-refresh-token", key);
  assert.equal(openSecret(sealed, key), "super-secret-refresh-token");
});

test("sealSecret round-trip works for the empty string", () => {
  const key = generateKeyBase64();
  const sealed = sealSecret("", key);
  assert.equal(openSecret(sealed, key), "");
});

test("sealJson/openJson round-trip preserves structured values", () => {
  const key = generateKeyBase64();
  const value = { grant: "upstream-token", scopes: ["read", "write"], count: 3, nested: { ok: true } };
  const sealed = sealJson(value, key);
  assert.deepEqual(openJson(sealed, key), value);
});

test("sealed value has the v1 compact format with three dot-separated segments", () => {
  const key = generateKeyBase64();
  const sealed = sealSecret("payload", key);
  const parts = sealed.split(".");
  assert.equal(parts.length, 3);
  assert.equal(parts[0], "v1");
  assert.match(parts[1], /^[A-Za-z0-9_-]+$/);
  assert.match(parts[2], /^[A-Za-z0-9_-]+$/);
});

test("sealSecret produces a fresh random IV on each call (ciphertexts differ)", () => {
  const key = generateKeyBase64();
  const sealedA = sealSecret("same-plaintext", key);
  const sealedB = sealSecret("same-plaintext", key);
  assert.notEqual(sealedA, sealedB);
  const [, ivA] = sealedA.split(".");
  const [, ivB] = sealedB.split(".");
  assert.notEqual(ivA, ivB);
});

test("openSecret rejects when decrypted with the wrong key", () => {
  const keyA = generateKeyBase64();
  const keyB = generateKeyBase64();
  const sealed = sealSecret("only-keyA-should-open-this", keyA);
  assert.throws(() => openSecret(sealed, keyB), SealDecryptError);
});

test("openSecret detects tampered ciphertext", () => {
  const key = generateKeyBase64();
  const sealed = sealSecret("do-not-tamper-with-me", key);
  const [version, iv, ciphertext] = sealed.split(".");
  // Flip one base64url character at index 0 (never straddles a padding
  // boundary, unlike the last character of an unpadded group) so the flip
  // always changes an actual ciphertext byte rather than unused padding bits.
  const flipCharAt = 0;
  const originalChar = ciphertext[flipCharAt];
  const replacementChar = originalChar === "A" ? "B" : "A";
  const tamperedCiphertext = replacementChar + ciphertext.slice(flipCharAt + 1);
  const tampered = `${version}.${iv}.${tamperedCiphertext}`;

  assert.throws(() => openSecret(tampered, key), SealDecryptError);
});

test("openSecret rejects an unrecognized format version", () => {
  const key = generateKeyBase64();
  const sealed = sealSecret("payload", key);
  const [, iv, ciphertext] = sealed.split(".");
  assert.throws(() => openSecret(`v2.${iv}.${ciphertext}`, key), SealFormatError);
});

test("openSecret rejects malformed segment counts", () => {
  const key = generateKeyBase64();
  assert.throws(() => openSecret("v1.onlyoneseg", key), SealFormatError);
  assert.throws(() => openSecret("v1.a.b.c", key), SealFormatError);
  assert.throws(() => openSecret("not-sealed-at-all", key), SealFormatError);
});

test("openSecret rejects non-base64url segment content", () => {
  const key = generateKeyBase64();
  assert.throws(() => openSecret("v1.not!base64url.also-not-b64", key), SealFormatError);
});

test("openSecret rejects an IV segment of the wrong decoded length", () => {
  const key = generateKeyBase64();
  // "AAAA" base64url-decodes to 3 bytes, not the required 12-byte IV.
  const sealed = sealSecret("payload", key);
  const [, , ciphertext] = sealed.split(".");
  assert.throws(() => openSecret(`v1.AAAA.${ciphertext}`, key), SealFormatError);
});

test("openSecret rejects a ciphertext segment too short to hold the auth tag", () => {
  const key = generateKeyBase64();
  assert.throws(() => openSecret("v1.AAAAAAAAAAAAAAAA.AAAA", key), SealFormatError);
});

test("sealSecret/openSecret reject non-string plaintext or sealed input", () => {
  const key = generateKeyBase64();
  assert.throws(() => sealSecret(12345, key), TypeError);
  assert.throws(() => openSecret(null, key), TypeError);
});

test("sealSecret/openSecret reject a key that is not 32 bytes of base64", () => {
  assert.throws(() => sealSecret("payload", "dG9vLXNob3J0"), TypeError);
  const key = generateKeyBase64();
  const sealed = sealSecret("payload", key);
  assert.throws(() => openSecret(sealed, "dG9vLXNob3J0"), TypeError);
});

test("generateKeyBase64 produces a usable, unique 32-byte key each call", () => {
  const keyA = generateKeyBase64();
  const keyB = generateKeyBase64();
  assert.notEqual(keyA, keyB);
  assert.equal(Buffer.from(keyA, "base64").length, 32);
  const sealed = sealSecret("usable-key-check", keyA);
  assert.equal(openSecret(sealed, keyA), "usable-key-check");
});

test("cross-implementation: sealed by this module opens with WebCrypto AES-GCM", async () => {
  const key = generateKeyBase64();
  const sealed = sealSecret("cross-implementation fixture payload", key);
  const [, ivPart, ciphertextPart] = sealed.split(".");

  const keyBytes = Buffer.from(key, "base64");
  const iv = Buffer.from(ivPart, "base64url");
  const data = Buffer.from(ciphertextPart, "base64url");

  const webCryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const plaintextBytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, webCryptoKey, data);
  assert.equal(Buffer.from(plaintextBytes).toString("utf8"), "cross-implementation fixture payload");
});

test("cross-implementation: sealed by WebCrypto AES-GCM opens with this module's openSecret", async () => {
  const key = generateKeyBase64();
  const keyBytes = Buffer.from(key, "base64");
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const webCryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, webCryptoKey, new TextEncoder().encode("webcrypto-sealed payload"));

  const sealed = `v1.${Buffer.from(iv).toString("base64url")}.${Buffer.from(ciphertext).toString("base64url")}`;
  assert.equal(openSecret(sealed, key), "webcrypto-sealed payload");
});
