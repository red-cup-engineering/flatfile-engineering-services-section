import assert from "node:assert/strict";
import test from "node:test";
import { encodeCbor, decodeCbor, deriveCborNi } from "../src/cbor.mjs";

test("encodeCbor and decodeCbor round-trip a value", () => {
  const encoded = encodeCbor({ value: { a: 1, b: [true, null, "x"] } });
  assert.deepEqual(decodeCbor(encoded), { value: { a: 1, b: [true, null, "x"] } });
});

test("deriveCborNi names an object's canonical CBOR encoding", () => {
  const result = deriveCborNi({ value: { a: 1, b: [true, null, "x"] } });
  assert.deepEqual(result, { uri: "ni:///sha-256;Fxmiz1tMWuCPq6aYxJjA09EzcEQ36EkSv0t9SevQHws" });
});
