import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../apps/cbor-cli.mjs";

test("the encode verb encodes a carrier value as base64 canonical CBOR", async () => {
  assert.deepEqual(await catalog.operations.encode.operation({ value: 42 }), { base64: "GCo=" });
});

test("the decode verb decodes base64 canonical CBOR", async () => {
  assert.deepEqual(await catalog.operations.decode.operation({ base64: "GCo=" }), { value: 42 });
});

test("the derive-ni verb names a value's canonical encoding", async () => {
  assert.deepEqual(await catalog.operations["derive-ni"].operation({ value: { a: 1, b: [true, null, "x"] } }), { uri: "ni:///sha-256;Fxmiz1tMWuCPq6aYxJjA09EzcEQ36EkSv0t9SevQHws" });
});

test("the catalog names exactly the three verbs", () => {
  assert.deepEqual(Object.keys(catalog.operations), ["encode", "decode", "derive-ni"]);
});
