import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateJsonSchema } from "../src/validation.mjs";
const cloudevents = JSON.parse(readFileSync(new URL("./fixtures/cloudevents-1.0.2.schema.json", import.meta.url), "utf8"));
const good = { specversion: "1.0", id: "a-1", source: "urn:example:src", type: "com.example.made", time: "2026-09-04T00:00:00Z", datacontenttype: "application/json", data: { x: 1 } };
test("local $ref definitions resolve against the root schema (CloudEvents 1.0.2 official schema)", () => {
    assert.equal(validateJsonSchema(good, cloudevents).valid, true);
    const bad = validateJsonSchema({ ...good, id: "", time: "yesterday" }, cloudevents);
    assert.equal(bad.valid, false);
    assert.deepEqual(bad.issues.map((i) => i.path).sort(), ["/id", "/time"]);
});
test("date-time and uri-reference formats", () => {
    const schema = { type: "object", properties: { t: { type: "string", format: "date-time" }, u: { type: "string", format: "uri-reference" } } };
    assert.equal(validateJsonSchema({ t: "2026-09-04T01:02:03.5+00:00", u: "/relative/path?x=1" }, schema).valid, true);
    const bad = validateJsonSchema({ t: "2026-09-04", u: "has space" }, schema);
    assert.deepEqual(bad.issues.map((i) => i.path), ["/t", "/u"]);
});
test("an unresolvable or cyclic $ref is an issue, never a hang", () => {
    assert.equal(validateJsonSchema(1, { $ref: "#/definitions/missing" }).issues[0]?.kind, "schema");
    assert.equal(validateJsonSchema(1, { $ref: "#", definitions: {} }).issues[0]?.kind, "schema");
});
