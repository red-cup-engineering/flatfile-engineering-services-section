import assert from "node:assert/strict";
import test from "node:test";
import { formCloudEvent } from "../scripts/form-cloudevent.mjs";
test("forms the required and optional attributes in stable order with extensions", () => {
  const e = formCloudEvent({ id: "1", source: "urn:s", type: "t", time: "2026-09-04T00:00:00Z", data: { a: 1 }, extensions: { emsenntruthcharge: "held" } });
  assert.deepEqual(Object.keys(e), ["specversion", "id", "source", "type", "time", "data", "emsenntruthcharge"]);
  assert.equal(e.specversion, "1.0");
});
test("refuses a missing required attribute by name", () => {
  assert.throws(() => formCloudEvent({ id: "1", type: "t" }), /source is required/u);
});
test("refuses a foreign specversion and a non-object extensions", () => {
  assert.throws(() => formCloudEvent({ id: "1", source: "s", type: "t", specversion: "0.3" }), /specversion must be 1.0/u);
  assert.throws(() => formCloudEvent({ id: "1", source: "s", type: "t", extensions: [] }), /extensions must be an object/u);
});
test("unknown request keys are not copied as context attributes", () => {
  assert.equal("garbage" in formCloudEvent({ id: "1", source: "s", type: "t", garbage: true }), false);
});
