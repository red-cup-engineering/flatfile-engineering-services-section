import assert from "node:assert/strict";
import test from "node:test";
import { canonicalCborToNiUri } from "../src/cbor.mjs";

test("canonicalCborToNiUri names exact canonical CBOR bytes", () => {
  assert.equal(
    canonicalCborToNiUri(Buffer.from([0x82, 0x64, 0x6d, 0x61, 0x72, 0x6b, 0x61, 0x78])),
    "ni:///sha-256;Uhc6FnNDtjj_QLJMLEHDKz1-dKcjfY5iKyccfIeN3LU",
  );
});

test("canonicalCborToNiUri refuses noncanonical CBOR and non-byte input", () => {
  assert.throws(() => canonicalCborToNiUri(Buffer.from([0x18, 0x00])), /deterministic/u);
  assert.throws(() => canonicalCborToNiUri("mark"), /Uint8Array/u);
});
