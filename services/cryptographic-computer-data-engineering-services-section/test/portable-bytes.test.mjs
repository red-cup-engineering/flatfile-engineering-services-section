import assert from "node:assert/strict";
import test from "node:test";
import { base64ToBytes, bytesCompare, bytesEqual, bytesToBase64, bytesToHex, bytesToLatin1, concatBytes, ownedBytes, utf8Bytes } from "../src/portable-bytes.mjs";

const samples = [new Uint8Array(0), Uint8Array.of(0), Uint8Array.of(0, 1, 127, 128, 255), Uint8Array.from({ length: 20_000 }, (_, i) => i % 256)];

test("portable byte helpers agree with the Node Buffer methods they replace", () => {
  for (const bytes of samples) {
    const buffer = Buffer.from(bytes);
    assert.equal(bytesToHex(bytes), buffer.toString("hex"));
    assert.equal(bytesToLatin1(bytes), buffer.toString("latin1"));
    assert.equal(bytesToBase64(bytes), buffer.toString("base64"));
    assert.deepEqual(base64ToBytes(buffer.toString("base64")), new Uint8Array(bytes));
    assert.equal(bytesEqual(bytes, buffer), true);
  }
  assert.deepEqual(concatBytes(samples[1], samples[2]), new Uint8Array(Buffer.concat([samples[1], samples[2]])));
  assert.deepEqual(utf8Bytes("café"), new Uint8Array(Buffer.from("café", "utf8")));
});

test("bytesCompare orders like Buffer.compare and bytesEqual refuses unequal bytes", () => {
  const cases = [[[], []], [[1], []], [[], [1]], [[1, 2], [1, 3]], [[2], [1, 9]], [[1, 2], [1, 2, 0]]];
  for (const [left, right] of cases) {
    assert.equal(Math.sign(bytesCompare(Uint8Array.from(left), Uint8Array.from(right))), Buffer.compare(Buffer.from(left), Buffer.from(right)));
    assert.equal(bytesEqual(Uint8Array.from(left), Uint8Array.from(right)), Buffer.from(left).equals(Buffer.from(right)));
  }
});

test("ownedBytes copies, and is a Uint8Array", () => {
  const source = Uint8Array.of(1, 2, 3);
  const copy = ownedBytes(source);
  source[0] = 9;
  assert.ok(copy instanceof Uint8Array);
  assert.equal(copy[0], 1);
});
