import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { bytesEqual, bytesToHex, bytesToLatin1, canonicalCarrier, canonicalizeSemioticJson, coincidenceKey, coincides, semanticHex, semanticBytes, semanticId } from "../src/semiotic-content-address/semiotic-content-address.mjs";

const CAFE_NFC = "caf\u00e9";
const CAFE_NFD = "cafe\u0301";

test("canonicalizeSemioticJson NFC-normalizes strings and text keys", () => {
  assert.deepEqual(canonicalizeSemioticJson({ [CAFE_NFD]: [CAFE_NFD] }), { [CAFE_NFC]: [CAFE_NFC] });
});

test("canonicalizeSemioticJson preserves admitted scalar and byte values", () => {
  const bytes = Buffer.from([0, 255]);
  assert.equal(canonicalizeSemioticJson(12n), 12n);
  assert.deepEqual(canonicalizeSemioticJson(bytes), bytes);
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

// --- Portability: addresses recorded before semanticBytes became a portable Uint8Array. ---
// These values were addressed with the Node-only (Buffer) implementation; every address and
// SHA-256 digest below must stay byte-identical.
const STABLE_VALUES = {
  null: null, true: true, zero: 0, negative: -7, float: 1.5, big: 12345678901234567890n, safeMax: Number.MAX_SAFE_INTEGER,
  unicode: "caf\u00e9 \u{1F600} \u4e2d\u6587", nfd: "cafe\u0301",
  bytes: new Uint8Array([0, 1, 127, 128, 255]), emptyBytes: new Uint8Array(0),
  nested: { b: [1, { z: null, a: "x" }, new Uint8Array([9, 9])], a: { deep: { deeper: [true, false, 2.25] } }, "caf\u00e9": 1 },
  list: ["a", ["b", ["c"]]],
};
const STABLE_IDS = {
  "null": "ni:///sha-256;sLKYi2u-ckus2l6eUkc23gvH2uQcRrQhPFDh011OXxM",
  "true": "ni:///sha-256;J6ve3f6FA0lq3rYjRmyqR9pfY6vSvG-hn2z8tz7P7XA",
  "zero": "ni:///sha-256;bjQLnP-zepicpUTmu3gKLHiQHT-zNzh2hRGjBhevoB0",
  "negative": "ni:///sha-256;lR3O46ek86rGfsdqLORGnMdt9lDxNL8lcr9gplyYIzg",
  "float": "ni:///sha-256;tou0XsqwMpq4Fdr0T1oC0qEairh_u99LCLyuAMraAyQ",
  "big": "ni:///sha-256;hPn0qHk9CobcOb0zqT7Mhwx-7j8hygoPM2VwTgbD1xc",
  "safeMax": "ni:///sha-256;FPUC6KMDQCiLnamO1V2fIwyKku6GM2GY320bTiePPR4",
  "unicode": "ni:///sha-256;XewOEHY6_wruwGaBUxIgEHJZaWbW5rJK5Cx5WIPR-lE",
  "nfd": "ni:///sha-256;2WkRa-i2ZRqaDML9ZYdCDKspxSg98yP19wzOm_h5CZM",
  "bytes": "ni:///sha-256;bGnNTtZ8dcXVqtU6tH09lZYdvqkUwl4PWwSjZP5aX8I",
  "emptyBytes": "ni:///sha-256;w2QfhUTXwC81gLB8D5iH8Maif_WrHUo-Kcrxl8_Cma4",
  "nested": "ni:///sha-256;z3zyw8XQEGE_S8nT5-OodXZYO52JN8QE-dfa30jlB-E",
  "list": "ni:///sha-256;IWj6NjJQ_tFWaAwhwtxFtNw5S4UOe_JimAsqWVmktfE"
};
const STABLE_HEX = {
  "null": "b0b2988b6bbe724bacda5e9e524736de0bc7dae41c46b4213c50e1d35d4e5f13",
  "true": "27abdeddfe8503496adeb623466caa47da5f63abd2bc6fa19f6cfcb73ecfed70",
  "zero": "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d",
  "negative": "951dcee3a7a4f3aac67ec76a2ce4469cc76df650f134bf2572bf60a65c982338",
  "float": "b68bb45ecab0329ab815daf44f5a02d2a11a8ab87fbbdf4b08bcae00cada0324",
  "big": "84f9f4a8793d0a86dc39bd33a93ecc870c7eee3f21ca0a0f3365704e06c3d717",
  "safeMax": "14f502e8a30340288b9da98ed55d9f230c8a92ee86336198df6d1b4e278f3d1e",
  "unicode": "5dec0e10763aff0aeec066815312201072596966d6e6b24ae42c795883d1fa51",
  "nfd": "d969116be8b6651a9a0cc2fd6587420cab29c5283df323f5f70cce9bf8790993",
  "bytes": "6c69cd4ed67c75c5d5aad53ab47d3d95961dbea914c25e0f5b04a364fe5a5fc2",
  "emptyBytes": "c3641f8544d7c02f3580b07c0f9887f0c6a27ff5ab1d4a3e29caf197cfc299ae",
  "nested": "cf7cf2c3c5d010613f4bc9d3e7e3a87576583b9d8937c404f9d7dadf48e507e1",
  "list": "2168fa363250fed156680c21c2dc45b4dc394b850e7bf262980b2a5959a4b5f1"
};

test("content addresses and digests are byte-identical to those recorded before the portable-bytes migration", () => {
  for (const [name, value] of Object.entries(STABLE_VALUES)) {
    assert.equal(semanticId(value), STABLE_IDS[name], `id of ${name}`);
    assert.equal(semanticHex(value), STABLE_HEX[name], `hex of ${name}`);
  }
});

test("semanticBytes is a Uint8Array and the portable helpers agree with the Node Buffer methods", () => {
  for (const value of Object.values(STABLE_VALUES)) {
    const bytes = semanticBytes(value);
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(bytesToHex(bytes), Buffer.from(bytes).toString("hex"));
    assert.equal(bytesToLatin1(bytes), Buffer.from(bytes).toString("latin1"));
    assert.ok(bytesEqual(bytes, semanticBytes(canonicalizeSemioticJson(value))));
    assert.equal(bytesEqual(bytes, new Uint8Array([...bytes, 0])), false);
    assert.equal(bytesEqual(bytes, Uint8Array.from(bytes)), true);
  }
  assert.equal(coincidenceKey("a"), bytesToLatin1(semanticBytes("a")));
  assert.equal(coincides(STABLE_VALUES.nested, canonicalCarrier(STABLE_VALUES.nested)), true);
  assert.equal(coincides({ a: 1 }, { a: 2 }), false);
});

test("semantic content identity carries no Node-only import in its module graph", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const path of ["../src/semiotic-content-address/semiotic-content-address.mjs", "../src/semiotic-content-address/semantic-content-identity.mjs"]) {
    const text = await readFile(new URL(path, import.meta.url), "utf8");
    assert.equal(/from\s+["']node:/.test(text), false, path);
    assert.equal(/\bBuffer\b/.test(text.replace(/\/\/.*$/gm, "").replace(/globalThis\.Buffer/g, "")), false, path);
  }
});
