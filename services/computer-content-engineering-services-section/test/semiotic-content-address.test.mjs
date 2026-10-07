import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { canonicalizeSemioticJson, semanticHex, semanticBytes } from "../src/semiotic-content-address/semiotic-content-address.mjs";

const CAFE_NFC = "caf\u00e9";
const CAFE_NFD = "cafe\u0301";

test("canonicalizeSemioticJson NFC-normalizes strings and text keys", () => {
  assert.deepEqual(canonicalizeSemioticJson({ [CAFE_NFD]: [CAFE_NFD] }), { [CAFE_NFC]: [CAFE_NFC] });
});

test("canonicalizeSemioticJson preserves admitted scalar and byte values", () => {
  const bytes = Buffer.from([0, 255]);
  assert.equal(canonicalizeSemioticJson(12n), 12n);
  assert.equal(canonicalizeSemioticJson(bytes), bytes);
  assert.equal(canonicalizeSemioticJson(null), null);
});

test("canonicalizeSemioticJson rejects collisions and unsupported values", () => {
  assert.throws(() => canonicalizeSemioticJson({ [CAFE_NFC]: 1, [CAFE_NFD]: 2 }), /collide/);
  assert.equal(canonicalizeSemioticJson(1.5), 1.5);
  assert.throws(() => canonicalizeSemioticJson(Number.NaN), /finite/);
  assert.throws(() => canonicalizeSemioticJson(Number.POSITIVE_INFINITY), /finite/);
  assert.throws(() => canonicalizeSemioticJson(new Date()), /unsupported/);
});

test("canonicalizeSemioticJson admits a deeply nested finite carrier without exhausting the call stack", () => {
  let value = "leaf";
  for (let index = 0; index < 20_000; index += 1) value = [value];
  let canonical = canonicalizeSemioticJson(value);
  for (let index = 0; index < 20_000; index += 1) canonical = canonical[0];
  assert.equal(canonical, "leaf");
});


test("portable semantic hex retains the native SHA-256 identity over canonical CBOR", () => {
  const carriers = [null, true, false, 0, -1, 1.5, 12n, "café", ["cafe\u0301", { b: 2, a: 1 }], Buffer.from([0, 255]), { evidence: { for: ["x"], against: [] } }];
  for (const carrier of carriers) {
    assert.equal(semanticHex(carrier), createHash("sha256").update(semanticBytes(carrier)).digest("hex"));
  }
  assert.equal(semanticHex("café"), semanticHex("cafe\u0301"));
});
