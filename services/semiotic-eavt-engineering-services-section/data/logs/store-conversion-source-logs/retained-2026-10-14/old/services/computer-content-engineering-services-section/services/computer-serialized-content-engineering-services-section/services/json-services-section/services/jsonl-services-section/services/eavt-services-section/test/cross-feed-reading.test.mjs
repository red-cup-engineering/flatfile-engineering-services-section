import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  crossFeedReading,
  journalPath,
  listFeedsAt,
  readAllFeedsEntries,
} from "../src/index.mjs";

test("discovers and composes independent feed custody", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "cross-feed-reading-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const at = "2026-08-14T12:00:00Z";
  const feedPath = (feed) => journalPath({ root, feed, at });
  for (const feed of ["alpha", "beta"]) mkdirSync(path.dirname(feedPath(feed)), { recursive: true });
  const base = { e: "urn:e", a: "urn:a" };
  writeFileSync(
    feedPath("alpha"),
    `${JSON.stringify({ ...base, v: "one", t: at })}\n`,
  );
  writeFileSync(
    feedPath("beta"),
    `${JSON.stringify({ ...base, v: "two", t: at })}\n`,
  );
  assert.deepEqual(listFeedsAt({ root, at }), ["alpha", "beta"]);
  assert.equal(readAllFeedsEntries({ root, at }).length, 2);
  const cell = crossFeedReading({ root, at })[JSON.stringify([base.e, base.a])];
  assert.equal(cell.independentlyWitnessed, true);
  assert.equal(cell.contested, true);
  assert.deepEqual(crossFeedReading({ root, at, since: "2026-08-15" }), {});
  assert.equal(
    crossFeedReading({ root, at, feeds: ["alpha"] })[
      JSON.stringify([base.e, base.a])
    ].independentlyWitnessed,
    false,
  );
  assert.deepEqual(
    cell.values.map(({ feeds }) => feeds),
    [["alpha"], ["beta"]],
  );
});
