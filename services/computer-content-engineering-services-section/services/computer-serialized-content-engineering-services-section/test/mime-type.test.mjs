import assert from "node:assert/strict";
import test from "node:test";
import { parseMimeType, serializeMimeType, mimeTypeEssence } from "../src/mime-type.mjs";

test("native MIME parsing retains ordered values and declares forgiving semantics", () => {
  const result = parseMimeType({ mediaType: ' Text/HTML; Charset="UTF-8"; charset=gbk; broken; boundary="a;b\\\"c" ' });
  assert.equal(result.essence, "text/html");
  assert.deepEqual(result.parameters, [{ name: "charset", value: "UTF-8" }, { name: "boundary", value: 'a;b"c' }]);
  assert.equal(result.serialized, 'text/html;charset=UTF-8;boundary="a;b\\\"c"');
  assert.deepEqual(parseMimeType({ mediaType: result.serialized }), result);
  assert.equal(mimeTypeEssence(" Application/Problem+JSON; charset=utf-8 "), "application/problem+json");
  for (const value of ["application/", "not-a-type", "/json", null]) assert.equal(mimeTypeEssence(value), null);
});

test("typed MIME serialization quotes safely without overwriting duplicate parameters", () => {
  const result = serializeMimeType({ type: "APPLICATION", subtype: "X.TEST+JSON", parameters: [{ name: "NOTE", value: 'a;b"c\\d' }, { name: "empty", value: "" }, { name: "latin", value: "\u00e9" }] });
  assert.equal(result.essence, "application/x.test+json");
  assert.deepEqual(parseMimeType({ mediaType: result.serialized }), result);
  for (const body of [
    { type: "text/html", subtype: "html", parameters: [] },
    { type: "text", subtype: "", parameters: [] },
    { type: "text", subtype: "html", parameters: [{ name: "charset", value: "a" }, { name: "CHARSET", value: "b" }] },
    { type: "text", subtype: "html", parameters: [{ name: "", value: "a" }] },
    { type: "text", subtype: "html", parameters: [{ name: "x", value: "a\r\nb" }] },
    { type: "text", subtype: "html", parameters: [{ name: "x", value: "\ud800" }] },
    { type: "text", subtype: "html", parameters: [{ name: "x", value: "\ud83d\ude00" }] },
  ]) assert.throws(() => serializeMimeType(body), TypeError);
});

test("MIME requests and serialized output have real byte and parameter bounds", () => {
  const maximum = "x/" + "a".repeat(4094);
  assert.equal(parseMimeType({ mediaType: maximum }).serialized, maximum);
  assert.throws(() => parseMimeType({ mediaType: maximum + "a" }), RangeError);
  const parameters = Array.from({ length: 32 }, (_, i) => ({ name: "p" + i, value: "x" }));
  assert.equal(serializeMimeType({ type: "x", subtype: "x", parameters }).parameters.length, 32);
  assert.throws(() => serializeMimeType({ type: "x", subtype: "x", parameters: [...parameters, { name: "extra", value: "x" }] }));
  assert.throws(() => serializeMimeType({ type: "x", subtype: "x", parameters: [{ name: "a", value: "\\".repeat(2048) }] }), RangeError);
  for (const body of [{}, { mediaType: 42 }, { mediaType: "text/plain", other: true }]) assert.throws(() => parseMimeType(body), TypeError);
});
