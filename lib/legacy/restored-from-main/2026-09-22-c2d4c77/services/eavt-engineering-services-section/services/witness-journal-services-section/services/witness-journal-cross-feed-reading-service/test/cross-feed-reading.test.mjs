import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { crossFeedReading, listFeedsAt, readAllFeedsEntries } from "../src/index.mjs";

test("discovers and composes independent feed custody", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cross-feed-reading-"));
  const at = "2026-08-14T12:00:00Z";
  const dir = path.join(root, "data", "logs", "2026", "08", "14");
  mkdirSync(dir, { recursive: true });
  const base = { e: "urn:e", a: "urn:a" };
  writeFileSync(path.join(dir, "alpha.jsonl"), `${JSON.stringify({ ...base, v: "one", t: at })}\n`);
  writeFileSync(path.join(dir, "beta.jsonl"), `${JSON.stringify({ ...base, v: "two", t: at })}\n`);
  assert.deepEqual(listFeedsAt(root, at), ["alpha", "beta"]);
  assert.equal(readAllFeedsEntries(root, at).length, 2);
  const cell = crossFeedReading(root, at)[JSON.stringify([base.e, base.a])];
  assert.equal(cell.independentlyWitnessed, true);
  assert.equal(cell.contested, true);
  assert.deepEqual(cell.values.map(({ feeds }) => feeds), [["alpha"], ["beta"]]);
});
