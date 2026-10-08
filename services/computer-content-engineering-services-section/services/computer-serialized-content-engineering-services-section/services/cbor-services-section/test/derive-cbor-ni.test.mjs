import assert from "node:assert/strict";
import test from "node:test";
import { deriveCborNi } from "../src/cbor.mjs";

test("names an object's canonical CBOR encoding", () => {
  const result = deriveCborNi({ value: { a: 1, b: [true, null, "x"] } });
  assert.deepEqual(result, { uri: "ni:///sha-256;Fxmiz1tMWuCPq6aYxJjA09EzcEQ36EkSv0t9SevQHws" });
});

test("names a scalar's canonical CBOR encoding", () => {
  const result = deriveCborNi({ value: 42 });
  assert.equal(typeof result.uri, "string");
  assert.match(result.uri, /^ni:\/\/\/sha-256;/u);
});

test("refuses a request with no value field", () => {
  assert.throws(() => deriveCborNi({}), /value is required/u);
});

test("refuses a value the codec does not admit, delegating the refusal to the CBOR codec", () => {
  // The platform codec admits finite floats (1.5 is a valid carrier value); a Symbol is not a carrier.
  assert.throws(() => deriveCborNi({ value: Symbol("not a carrier") }), /unsupported CBOR codec carrier value/u);
  assert.throws(() => deriveCborNi({ value: Number.NaN }), /must be finite/u);
});
