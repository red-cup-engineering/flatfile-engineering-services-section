// store-change-witness.test: a type's records directory is the one path whose mtime moves when the
// type gains a record, and only then.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { appended, put, recordsChangeWitness } from "../src/store.mjs";

const root = mkdtempSync(path.join(tmpdir(), "seavt-witness-"));
process.on("exit", () => rmSync(root, { recursive: true, force: true }));
const past = new Date("2020-01-01T00:00:00Z");

test("a new record moves its type's witness; a repeated put does not", () => {
  put(root, "work-arena-move", { move: "open", n: 0 });
  const witness = recordsChangeWitness(root, "work-arena-move");
  assert.equal(witness, path.join(root, "data", "records", "work-arena-move-records"));
  utimesSync(witness, past, past);
  put(root, "work-arena-move", { move: "open", n: 0 });
  assert.equal(statSync(witness).mtimeMs, past.getTime());
  for (let n = 1; n < 40; n += 1) {
    utimesSync(witness, past, past);
    put(root, "work-arena-move", { move: "open", n });
    assert.ok(statSync(witness).mtimeMs > past.getTime(), `record ${n} moved the witness`);
  }
});

test("another type's witness does not move", () => {
  put(root, "enterprise-setting", { enterprise: "e", axis: "a" });
  const other = recordsChangeWitness(root, "enterprise-setting");
  utimesSync(other, past, past);
  put(root, "work-arena-move", { move: "open", n: 99 });
  assert.equal(statSync(other).mtimeMs, past.getTime());
  assert.equal(appended(root, "work-arena-move").records.length, 41);
});

test("the witness checks its root and type name", () => {
  assert.throws(() => recordsChangeWitness(root, "Bad Type"));
  assert.throws(() => recordsChangeWitness("", "work-arena-move"));
});
