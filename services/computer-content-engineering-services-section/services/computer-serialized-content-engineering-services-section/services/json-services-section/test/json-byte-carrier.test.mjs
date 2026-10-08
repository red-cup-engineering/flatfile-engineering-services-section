import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { decodeJsonByteCarrier } from "../scripts/decode-json-byte-carrier.mjs";
import { encodeJsonByteCarrier } from "../scripts/encode-json-byte-carrier.mjs";

test("round trips exact bytes through the two-field JSON carrier", () => {
  const input = [0, 1, 2, 127, 128, 255];
  const carrier = encodeJsonByteCarrier({
    bytes: input,
    mediaType: "application/example",
  });
  assert.deepEqual(carrier, {
    mediaType: "application/example",
    contentBase64: "AAECf4D/",
  });
  const admitted = decodeJsonByteCarrier({
    carrier,
    expectedMediaType: "application/example",
    maximumBytes: input.length,
  });
  assert.deepEqual(admitted.bytes, input);
});

test("refuses widened, noncanonical, mistyped, and oversized carriers", () => {
  const carrier = encodeJsonByteCarrier({
    bytes: Array.from(Buffer.from("exact")),
    mediaType: "text/plain",
  });
  assert.throws(
    () => decodeJsonByteCarrier({ carrier: { ...carrier, byteLength: 5 } }),
    /exactly/u,
  );
  assert.throws(
    () =>
      decodeJsonByteCarrier({
        carrier: { ...carrier, contentBase64: "ZXhhY3Q" },
      }),
    /canonical Base64/u,
  );
  assert.throws(
    () =>
      decodeJsonByteCarrier({ carrier, expectedMediaType: "text/markdown" }),
    /mediaType/u,
  );
  assert.throws(
    () => decodeJsonByteCarrier({ carrier, maximumBytes: 4 }),
    /exceeds/u,
  );
});

test("the byte-carrier commands exchange JSON byte arrays rather than native buffers", () => {
  const encode = fileURLToPath(
    new URL("../scripts/encode-json-byte-carrier.mjs", import.meta.url),
  );
  const decode = fileURLToPath(
    new URL("../scripts/decode-json-byte-carrier.mjs", import.meta.url),
  );
  const encoded = spawnSync(process.execPath, [encode], {
    input: '{"bytes":[0,255],"mediaType":"application/example"}\n',
    encoding: "utf8",
  });
  assert.equal(encoded.status, 0, encoded.stderr);
  const decoded = spawnSync(process.execPath, [decode], {
    input: JSON.stringify({ carrier: JSON.parse(encoded.stdout) }) + "\n",
    encoding: "utf8",
  });
  assert.equal(decoded.status, 0, decoded.stderr);
  assert.deepEqual(JSON.parse(decoded.stdout), {
    mediaType: "application/example",
    bytes: [0, 255],
  });
});
