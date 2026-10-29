import assert from "node:assert/strict";
import test from "node:test";
import { validateCloudEvent } from "../scripts/validate-cloudevent.mjs";
const good = { specversion: "1.0", id: "a-1", source: "urn:example:src", type: "com.example.made", time: "2026-09-04T00:00:00Z", datacontenttype: "application/json", data: { x: 1 }, emsenntruthcharge: "held" };
test("a conformant event has no violations and is returned unchanged", () => {
  const r = validateCloudEvent({ event: good });
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
  assert.deepEqual(r.event, good);
});
test("required attributes are the published schema's rules and specversion is the unstated one", () => {
  const r = validateCloudEvent({ event: { specversion: "0.3", source: "urn:example:src" } });
  assert.deepEqual(r.violations.map((v) => v.keyword).sort(), ["const", "required", "required"]);
  assert.ok(r.violations.every((v) => v.kind === "instance"));
});
test("a malformed time is the schema's date-time rule; extension naming is the unstated rule", () => {
  const r = validateCloudEvent({ event: { ...good, time: "yesterday", "Bad-Name": "x" } });
  assert.deepEqual(r.violations.map((v) => v.path).sort(), ["/Bad-Name", "/time"]);
});
test("data and data_base64 together is a violation", () => {
  assert.ok(validateCloudEvent({ event: { ...good, data_base64: "AAAA" } }).violations.some((v) => v.path === "/data"));
});
test("refuses a missing event", () => assert.throws(() => validateCloudEvent({}), /event is required/u));
