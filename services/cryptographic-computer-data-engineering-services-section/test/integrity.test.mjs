// Migrated from the deleted @red-cup-engineering/cryptographic-integrity-service
// package's test/cryptographic-integrity.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import { sha256Hex, sha1Base64, hmacSha256Base64Url, timingSafeStringEqual } from "../src/integrity.mjs";

test("recovered digest and constant-time equality operations remain stable", () => {
  assert.equal(sha256Hex("proof-path"), "aac5bb477e3e21450cc7a3869d61199fcf9f80a5679245a7cf34601520a5634a");
  assert.equal(timingSafeStringEqual("same", "same"), true);
  assert.equal(timingSafeStringEqual("same", "different"), false);
});

test("sha1Base64 matches node:crypto's own sha1/base64 encoding", () => {
  assert.equal(sha1Base64(""), "2jmj7l5rSw0yVb/vlWAYkK/YBwk=");
});

test("hmacSha256Base64Url is stable across multiple update() parts", () => {
  const oneShot = hmacSha256Base64Url("secret", ["hello-world"]);
  const chunked = hmacSha256Base64Url("secret", ["hello-", "world"]);
  assert.equal(oneShot, chunked);
});
