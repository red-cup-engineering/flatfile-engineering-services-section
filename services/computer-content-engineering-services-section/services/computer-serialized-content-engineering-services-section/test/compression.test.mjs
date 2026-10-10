import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync, gunzipSync, deflateSync, inflateSync, deflateRawSync, inflateRawSync } from "node:zlib";
import { compressContent, decompressContent } from "../src/compression.mjs";

const carrier = bytes => ({ mediaType: "application/octet-stream", contentBase64: Buffer.from(bytes).toString("base64") });
const formats = [["gzip", gzipSync, gunzipSync], ["deflate", deflateSync, inflateSync], ["deflate-raw", deflateRawSync, inflateRawSync]];

test("native stream codecs exchange exact arbitrary bytes with independent zlib producers and receivers", async () => {
  for (const bytes of [Buffer.alloc(0), Buffer.from([0, 255, 128, 1, 0]), Buffer.from("café\n"), Buffer.alloc(65536, 255)]) {
    for (const [format, encode, decode] of formats) {
      const compressed = await compressContent({ format, carrier: carrier(bytes) });
      assert.deepEqual(decode(Buffer.from(compressed.carrier.contentBase64, "base64")), bytes);
      assert.equal(compressed.decodedMediaType, "application/octet-stream");
      assert.equal(compressed.inputBytes, bytes.length);
      const decoded = await decompressContent({ format, carrier: carrier(encode(bytes)), decodedMediaType: "application/test" });
      assert.deepEqual(Buffer.from(decoded.carrier.contentBase64, "base64"), bytes);
      assert.equal(decoded.carrier.mediaType, "application/test");
      assert.equal(decoded.outputBytes, bytes.length);
    }
  }
});

test("the single-stream profile refuses corruption, truncation, trailing input, dictionaries and excessive expansion", async () => {
  for (const [format, encode] of formats) {
    const valid = encode(Buffer.from("abc"));
    for (const bytes of [Buffer.alloc(0), valid.subarray(0, -1), Buffer.concat([valid, Buffer.of(1)])]) {
      await assert.rejects(decompressContent({ format, carrier: carrier(bytes) }), TypeError);
    }
    await assert.rejects(decompressContent({ format, carrier: carrier(encode(Buffer.alloc(65537))) }), RangeError);
    await assert.rejects(compressContent({ format, carrier: carrier(Buffer.alloc(65537)) }), RangeError);
  }
  const corrupted = gzipSync("abc"); corrupted[corrupted.length - 8] ^= 1;
  await assert.rejects(decompressContent({ format: "gzip", carrier: carrier(corrupted) }), TypeError);
  await assert.rejects(decompressContent({ format: "gzip", carrier: carrier(Buffer.concat([gzipSync("a"), gzipSync("b")])) }), TypeError);
  await assert.rejects(decompressContent({ format: "deflate", carrier: carrier(deflateSync("abc", { dictionary: Buffer.from("abc") })) }), TypeError);
  await assert.rejects(compressContent({ format: "gzip", carrier: { mediaType: "text/plain", contentBase64: "AB==" } }), TypeError);
  await assert.rejects(compressContent({ format: "constructor", carrier: carrier([]) }), TypeError);
});

test("one raw deflate stream or one gzip member is the whole input: whatever follows it is refused", async () => {
  const named = Buffer.concat([Buffer.from([0x1f, 0x8b, 8, 8 | 16 | 4, 0, 0, 0, 0, 0, 3, 2, 0, 0x41, 0x42]), Buffer.from("n\0c\0"), gzipSync("abc").subarray(10)]);
  for (const [format, valid] of [["deflate-raw", deflateRawSync(Buffer.from("abc"))], ["gzip", gzipSync("abc")], ["gzip", named]]) {
    const decoded = await decompressContent({ format, carrier: carrier(valid) });
    assert.equal(Buffer.from(decoded.carrier.contentBase64, "base64").toString(), "abc");
    for (const tail of [Buffer.of(1), Buffer.of(0), valid]) {
      await assert.rejects(decompressContent({ format, carrier: carrier(Buffer.concat([valid, tail])) }), TypeError);
    }
  }
});
