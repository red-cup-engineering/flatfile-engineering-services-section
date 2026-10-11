import assert from "node:assert/strict";
import test from "node:test";
import vectors from "./fixtures/rfc8949-appendix-a.json" with { type: "json" };
import { encodeCanonical, decodeCanonical } from "../src/cbor.mjs";
import { encodeJsonCbor, decodeCborJson, diagnoseCbor, checkDeterministicCbor } from "../src/transformations.mjs";
const carrier = hex => ({ carrier: { mediaType: "application/cbor", contentBase64: Buffer.from(hex,"hex").toString("base64") } });
// Primary vectors: hildjj/test-vectors@cbab23c3fa16a0c9323e1bdc4783e6bbc3a2966d,
// appendix_a.json; RFC 8949 Appendix A. Five decoded values exceed ordinary JSON.
test("RFC vectors cross the CBOR carrier without silent JSON losses", () => {
  let json = 0, refused = 0;
  for (const row of vectors) {
    const request = { carrier: { mediaType: "application/cbor", contentBase64: row.cbor } };
    assert.equal(diagnoseCbor(request).byteLength, Buffer.from(row.cbor,"base64").length);
    if (Object.hasOwn(row,"decoded")) {
      if (["1bffffffffffffffff","c249010000000000000000","3bffffffffffffffff","c349010000000000000000","f98000"].includes(row.hex)) { assert.throws(() => decodeCborJson(request),TypeError); refused++; }
      else { assert.deepEqual(decodeCborJson(request).value,row.decoded); json++; }
    }
  }
  assert.equal(vectors.length,82); assert.equal(json,54); assert.equal(refused,5);
});
test("wire determinism is distinct from ordinary JSON and application tag meaning", () => {
  assert.equal(checkDeterministicCbor(carrier("a21864012002")).deterministic,true);
  assert.equal(checkDeterministicCbor(carrier("a22002186401")).deterministic,false);
  assert.equal(checkDeterministicCbor(carrier("fa3fc00000")).deterministic,false);
  assert.equal(decodeCborJson(carrier("fa3fc00000")).value,1.5);
  assert.equal(checkDeterministicCbor(carrier("f98000")).deterministic,true);
  assert.equal(diagnoseCbor(carrier("f98000")).diagnostic,"-0.0");
  assert.throws(() => decodeCborJson(carrier("f98000")),TypeError);
  assert.equal(diagnoseCbor(carrier("c0f6")).diagnostic,"0(null)");
  assert.throws(() => decodeCborJson(carrier("c0f6")),TypeError);
  assert.deepEqual(decodeCborJson(carrier("9f0102ff")).value,[1,2]);
  assert.equal(checkDeterministicCbor(carrier("9f0102ff")).deterministic,false);
});
test("BOM and prototype-looking keys retain bytes and remain data", () => {
  const value=JSON.parse('{"__proto__":{"safe":true},"constructor":1,"text":"﻿text"}');
  assert.deepEqual(decodeCanonical(encodeCanonical(value)),value);
  const encoded=encodeJsonCbor({value}); assert.deepEqual(decodeCborJson({carrier:encoded.carrier}).value,value);
  assert.equal(Object.getPrototypeOf(decodeCborJson({carrier:encoded.carrier}).value),Object.prototype);
  // Duplicate decoded keys with different wire encodings cannot silently overwrite.
  assert.throws(() => decodeCborJson(carrier("a261610178016102")),/unique text-string/);
  assert.throws(() => decodeCborJson(carrier("a201010102")),/unique text-string/);
});
test("conversion closure and malformed representations are refused before sale", () => {
  const value="a".repeat(65533), encoded=encodeJsonCbor({value}); assert.equal(encoded.byteLength,65536);
  assert.equal(decodeCborJson({carrier:encoded.carrier}).value,value);
  assert.throws(() => encodeJsonCbor({value:"a".repeat(65535)}),RangeError);
  for (const hex of ["", "1818ff", "9f01", "61ff", "a16161", "0102", "ff"]) for(const op of [decodeCborJson,diagnoseCbor,checkDeterministicCbor]) assert.throws(() => op(carrier(hex)), error => error instanceof TypeError || error instanceof RangeError);
  assert.throws(() => encodeJsonCbor({value:-0}),TypeError);
  assert.throws(() => encodeJsonCbor({value:"\ud800"}),TypeError);
  assert.throws(() => diagnoseCbor({carrier:{mediaType:"application/cbor",contentBase64:"AA"}}),TypeError);
  assert.throws(() => encodeJsonCbor({value:Array(8192).fill(null)}),RangeError);
});
