import assert from "node:assert/strict";
import test from "node:test";
import { canonicalEqual, decodeCanonical, encodeCanonical, encodeCanonicalArrayHeader, encodeCanonicalScalar } from "../src/cbor.mjs";

const CAFE_NFC = "caf\u00e9";
const CAFE_NFD = "cafe\u0301";
const term = ["app", ["lam", ["var", 0]], ["mark", "x"]];

test("encodeCanonical and decodeCanonical round-trip admitted carriers", () => {
  for (const value of [true, false, null, 0, -1, 1.5, 1_000_000.5, 1.0000000001, Number.MAX_SAFE_INTEGER, 9007199254740992n, "text", Buffer.from([0, 1, 255]), [], [1, [2]], { b: 2, a: 1 }, term]) {
    assert.deepEqual(decodeCanonical(encodeCanonical(value)), value);
  }
});

test("encodeCanonical uses RFC 8949 deterministic encodings", () => {
  assert.equal(encodeCanonical(false).toString("hex"), "f4");
  assert.equal(encodeCanonical(CAFE_NFC).toString("hex"), "65636166c3a9");
  assert.equal(encodeCanonical({ zebra: 1, apple: 2, mango: 3 }).toString("hex"), "a3656170706c6502656d616e676f03657a6562726101");
  assert.equal(encodeCanonical(1.5).toString("hex"), "f93e00");
  assert.equal(encodeCanonical(1_000_000.5).toString("hex"), "fa49742408");
});

test("streaming writers reuse canonical scalar and array-header primitives", () => {
  assert.equal(Buffer.concat([encodeCanonicalArrayHeader(2), encodeCanonicalScalar("pair"), encodeCanonicalScalar(1)]).toString("hex"), encodeCanonical(["pair", 1]).toString("hex"));
  assert.throws(() => encodeCanonicalScalar(["not", "scalar"]), /scalar/u);
});

test("encodeCanonical does not smuggle carrier normalization into CBOR", () => {
  assert.notEqual(encodeCanonical(CAFE_NFC).toString("hex"), encodeCanonical(CAFE_NFD).toString("hex"));
});

test("encodeCanonical handles deeply nested admitted arrays without using the JavaScript call stack", () => {
  let value = "leaf";
  for (let depth = 0; depth < 20_000; depth += 1) value = [value];
  const encoded = encodeCanonical(value);
  assert.equal(encoded.subarray(-5).toString("hex"), "646c656166");
});

test("canonicalEqual compares canonical CBOR representations", () => {
  assert.equal(canonicalEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  assert.equal(canonicalEqual([1, 2], [1, 2, 3]), false);
});

test("decodeCanonical rejects non-deterministic encodings", () => {
  assert.throws(() => decodeCanonical(Buffer.from([0x18, 0x00])), /deterministic/);
  assert.throws(() => decodeCanonical(Buffer.from("fa3fc00000", "hex")), /deterministic/);
  assert.throws(() => decodeCanonical(Buffer.from("fb412e848100000000", "hex")), /deterministic/);
  assert.throws(() => decodeCanonical(Buffer.from("c0f6", "hex")), /tags/);
});

test("CBOR codec refuses non-finite numbers, negative zero, and malformed Unicode", () => {
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => encodeCanonical(value), /finite/);
  assert.equal(encodeCanonical(-0).toString("hex"), "00");
  assert.throws(() => decodeCanonical(Buffer.from("f98000", "hex")), /deterministic/);
  assert.throws(() => encodeCanonical("\ud800"), /unpaired Unicode surrogate/);
  assert.throws(() => encodeCanonical({ "\udc00": true }), /unpaired Unicode surrogate/);
  assert.throws(() => decodeCanonical(Buffer.from([0x61, 0xff])), /encoded data was not valid/);
});
