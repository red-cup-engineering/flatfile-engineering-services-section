import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  assertObjectDatom,
  currentDatomValue,
  foldObjectDatoms,
  settledDatom,
  settle,
  objectDatomId,
} from "../src/index.mjs";
const first = { e: "s", a: "p", v: "v", tx: 1, op: "assert" };
test("ordered assert/retract facts retain the full contradictory evidence", () => {
  const retracted = { ...first, tx: 2, op: "retract" };
  assert.deepEqual(currentDatomValue([first, retracted]), []);
  const folded = foldObjectDatoms([first, retracted]);
  assert.deepEqual(folded.cells[0].evidence, [[1], [2]]);
  assert.equal(folded.cells[0].value, "stable");
  assert.deepEqual(currentDatomValue([first, retracted, { ...first, tx: 3 }]), [
    { e: "s", a: "p", v: "v" },
  ]);
  assert.equal(
    objectDatomId(first),
    objectDatomId({ op: "assert", tx: 1, v: "v", a: "p", e: "s" }),
  );
});
test("a null judgment settles; an absent judgment leaves a row live", () => {
  const row = { e: "s", a: "p", v: "v", t: 1 };
  assert.deepEqual(settle({ entries: [{ row, reading: null }, { row }] }), {
    datoms: [["s", "p", "v", 1, null]],
    kept: [row],
  });
  assert.deepEqual(settledDatom({ row: ["s", "p", "v", 1], reading: false }), [
    "s",
    "p",
    "v",
    1,
    false,
  ]);
  assert.throws(() => settledDatom({ row, reading: undefined }), TypeError);
  assert.throws(() => assertObjectDatom({ ...first, op: "maybe" }), TypeError);
});
test("the fold script accepts and returns JSON directly", () => {
  const result = spawnSync(
    process.execPath,
    [new URL("../scripts/fold-datom-evidence.mjs", import.meta.url).pathname],
    { input: JSON.stringify([first]), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), foldObjectDatoms([first]));
});
