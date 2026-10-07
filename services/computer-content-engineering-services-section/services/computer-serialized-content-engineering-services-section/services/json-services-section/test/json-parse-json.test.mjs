import assert from "node:assert/strict";
import test from "node:test";
import { parseJson } from "../scripts/parse-json.mjs";

test("parses valid JSON text to a value", () => {
  assert.deepEqual(parseJson({ text: '{"a":1}' }), {
    ok: true,
    value: { a: 1 },
  });
});

test("parses a JSON scalar", () => {
  assert.deepEqual(parseJson({ text: "42" }), { ok: true, value: 42 });
});

test("refuses a missing text", () => {
  assert.throws(() => parseJson({}), /text must be a string/u);
});

test("reports a refusal with the parse error position for malformed JSON", () => {
  const result = parseJson({ text: "{bad}" });
  assert.equal(result.ok, false);
  assert.equal(typeof result.error.message, "string");
  assert.equal(result.error.position, 1);
});

test("reports a null position when the underlying message names none", () => {
  const result = parseJson({ text: "" });
  assert.equal(result.ok, false);
  assert.equal(result.error.position, null);
});
