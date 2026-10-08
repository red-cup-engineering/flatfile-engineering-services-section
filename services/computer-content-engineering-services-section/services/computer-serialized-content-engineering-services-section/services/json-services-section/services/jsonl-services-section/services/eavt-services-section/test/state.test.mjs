import assert from "node:assert/strict";
import test from "node:test";
import { latestState } from "../scripts/latest-state.mjs";
import { situationWindow } from "../scripts/situation-window.mjs";
import { readEavtState } from "../scripts/read-eavt-state.mjs";
const entries = [
  { e: "one", a: "state", v: "open", t: "2026-07-01" },
  { e: "one", a: "state", v: "closed", t: "2026-07-02" },
  { e: "two", a: "state", v: "open", t: "2026-07-01" },
];
test("latest state keeps one latest witness per EAVT cell", () => {
  const state = latestState({ entries });
  assert.equal(Object.keys(state).length, 2);
  assert.equal(Object.values(state).find((x) => x.e === "one").value, "closed");
});
test("situational state reports disagreements without storing charge", () => {
  const state = readEavtState({ entries });
  const cell = Object.values(state).find((x) => x.e === "one");
  assert.equal(cell.contested, true);
  assert.equal("charge" in cell, false);
  assert.equal(situationWindow({ entries, since: "2026-07-02" }).length, 1);
});
