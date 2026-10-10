import assert from "node:assert/strict";
import test from "node:test";
import { encodeUtf8Text, decodeUtf8Text, normalizeUnicodeText } from "../src/text-codecs.mjs";

test("native UTF-8 preserves scalar text, BOM, NUL and line endings with independent bytes", () => {
  for (const text of ["", "\uFEFFPheží Ocháǧe\0\r\n🛶", "\uFFFF", "e\u0301"]) {
    const encoded = encodeUtf8Text({ text });
    assert.equal(encoded.carrier.contentBase64, Buffer.from(text, "utf8").toString("base64"));
    assert.deepEqual(decodeUtf8Text({ carrier: encoded.carrier }), { text, byteLength: Buffer.byteLength(text) });
  }
  const text = "x".repeat(65536);
  assert.equal(decodeUtf8Text({ carrier: encodeUtf8Text({ text }).carrier }).text, text);
  for (const bytes of [[0x80], [0xC0, 0xAF], [0xED, 0xA0, 0x80], [0xF4, 0x90, 0x80, 0x80], [0xF0, 0x9F, 0x9B]]) {
    assert.throws(() => decodeUtf8Text({ carrier: { mediaType: "text/plain;charset=utf-8", contentBase64: Buffer.from(bytes).toString("base64") } }));
  }
  for (const text of ["\uD800", "\uDC00", "x".repeat(65537), "🛶".repeat(16385)]) assert.throws(() => encodeUtf8Text({ text }));
  assert.throws(() => decodeUtf8Text({ carrier: { mediaType: "application/octet-stream", contentBase64: "eA==" } }));
  assert.throws(() => decodeUtf8Text({ carrier: { mediaType: "text/plain;charset=utf-8", contentBase64: "eB==" } }));
});

test("native Unicode forms are explicit, retain exact counts and bound expansion", () => {
  for (const [form, text, expected] of [["NFC", "e\u0301", "é"], ["NFD", "é", "e\u0301"], ["NFKC", "①ﬃÅ", "1ffiÅ"], ["NFKD", "①ﬃÅ", "1ffiA\u030A"]]) {
    assert.deepEqual(normalizeUnicodeText({ form, text }), { text: expected, form, changed: text !== expected, inputBytes: Buffer.byteLength(text), outputBytes: Buffer.byteLength(expected) });
    assert.equal(normalizeUnicodeText({ form, text: expected }).changed, false);
  }
  assert.equal(normalizeUnicodeText({ form: "NFD", text: "é".repeat(21845) }).outputBytes, 65535);
  assert.throws(() => normalizeUnicodeText({ form: "NFD", text: "é".repeat(21846) }));
  assert.throws(() => normalizeUnicodeText({ text: "é" }));
  assert.throws(() => normalizeUnicodeText({ form: "nfc", text: "é" }));
  assert.throws(() => normalizeUnicodeText({ form: "NFC", text: "\uD800" }));
});
