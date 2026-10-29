import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJsonByteCarrier, decodeJsonByteCarrier, encodeJsonByteCarrier, jsonByteCarrierValue } from "../dist/json/json-byte-carrier.mjs";

test("JSON byte carrier value recursively maps bytes while preserving own-entry semantics", () => {
  const inherited = Object.create({ ignored: new Uint8Array([9]) });
  inherited.a = [new Uint8Array([0, 1]), undefined];
  inherited.z = { bytes: new Uint8Array([255]), missing: undefined };
  assert.deepEqual(jsonByteCarrierValue(inherited), {
    a: [{ $bytes: "AAE" }, undefined],
    z: { bytes: { $bytes: "_w" }, missing: undefined },
  });
  assert.equal(jsonByteCarrierValue(Number.NaN), Number.NaN);
  assert.equal(jsonByteCarrierValue(undefined), undefined);
});

test("canonical JSON byte carrier sorts nested records and uses exact base64url envelopes", () => {
  const value = {
    z: new Uint8Array([255, 254]),
    a: [{ z: 2, bytes: new Uint8Array([0, 1, 2]) }, new Uint8Array([251, 255])],
  };
  assert.equal(canonicalJsonByteCarrier(value), '{"a":[{"bytes":{"$bytes":"AAEC"},"z":2},{"$bytes":"-_8"}],"z":{"$bytes":"__4"}}');
});

test("canonical JSON byte carrier refuses values outside JSON", () => {
  const inherited = Object.create({ ignored: new Uint8Array([9]) });
  inherited.z = undefined;
  inherited.a = new Uint8Array([0]);
  assert.throws(() => canonicalJsonByteCarrier(undefined), /JSON value/u);
  assert.throws(() => canonicalJsonByteCarrier([new Uint8Array([0]), undefined]), /JSON value/u);
  assert.throws(() => canonicalJsonByteCarrier({ z: undefined, a: new Uint8Array([255]) }), /JSON value/u);
  assert.throws(() => canonicalJsonByteCarrier(inherited), /JSON value/u);
  assert.throws(() => canonicalJsonByteCarrier(Number.NaN), /JSON value/u);
});

test("round trips exact bytes through the two-field JSON carrier", () => {
  const input = Buffer.from([0, 1, 2, 127, 128, 255]);
  const carrier = encodeJsonByteCarrier(input, { mediaType: "application/example" });
  assert.deepEqual(carrier, { mediaType: "application/example", contentBase64: "AAECf4D/" });
  const admitted = decodeJsonByteCarrier(carrier, { expectedMediaType: "application/example", maximumBytes: input.length });
  assert.deepEqual(admitted.bytes, input);
});

test("refuses widened, noncanonical, mistyped, and oversized carriers", () => {
  const carrier = encodeJsonByteCarrier(Buffer.from("exact"), { mediaType: "text/plain" });
  assert.throws(() => decodeJsonByteCarrier({ ...carrier, byteLength: 5 }), /exactly/u);
  assert.throws(() => decodeJsonByteCarrier({ ...carrier, contentBase64: "ZXhhY3Q" }), /canonical Base64/u);
  assert.throws(() => decodeJsonByteCarrier(carrier, { expectedMediaType: "text/markdown" }), /mediaType/u);
  assert.throws(() => decodeJsonByteCarrier(carrier, { maximumBytes: 4 }), /exceeds/u);
});
