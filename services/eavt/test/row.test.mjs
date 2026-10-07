import assert from "node:assert/strict";
import test from "node:test";
import { eavtRow } from "../scripts/admit-row.mjs";
import { normalizeEavtRow } from "../scripts/normalize-row.mjs";
import { sameEavtRows } from "../scripts/same-eavt-rows.mjs";
import { isEavtRow } from "../scripts/is-eavt-row.mjs";
test("generic EAVT admits JSON e/a/v/t and normalizes tuple spelling", () => {
  const row = eavtRow({ e: "s", a: "p", v: 1, t: "now" });
  assert.deepEqual(normalizeEavtRow(["s", "p", 1, "now"]), row);
  assert.equal(sameEavtRows({ left: row, right: ["s", "p", 1, "now"] }), true);
  assert.equal(isEavtRow({ e: "s", a: "p", v: () => {}, t: "now" }), false);
});
