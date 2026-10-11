import assert from "node:assert/strict";
import test from "node:test";
import { keyedJsonText } from "../scripts/keyed-json-text.mjs";

test("a keyed register reads one entry per line and parses back to the same value", () => {
  const value = { source: "layer", parcels: { "010-2": { owner: "B", acres: 1 }, "010-1": { owner: "A", acres: 0.5 } }, pulledAt: "2026-10-11" };
  const text = keyedJsonText(value, "parcels");
  assert.deepEqual(JSON.parse(text), value);
  assert.equal(text, [
    "{",
    '  "parcels": {',
    '    "010-1": {"acres":0.5,"owner":"A"},',
    '    "010-2": {"acres":1,"owner":"B"}',
    "  },",
    '  "pulledAt": "2026-10-11",',
    '  "source": "layer"',
    "}",
    "",
  ].join("\n"));
});

test("an empty register is an empty object, and a register that is not an object of records is refused", () => {
  assert.deepEqual(JSON.parse(keyedJsonText({ parcels: {} }, "parcels")), { parcels: {} });
  assert.throws(() => keyedJsonText({ parcels: [] }, "parcels"), TypeError);
  assert.throws(() => keyedJsonText([], "parcels"), TypeError);
});
