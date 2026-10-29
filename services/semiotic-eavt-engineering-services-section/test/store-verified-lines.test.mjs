// A verification verdict is held only for the exact bytes that were proven: a line that names a proven
// address with other content is still refused, and the held verdicts have a fixed bound.
import assert from "node:assert/strict";
import test from "node:test";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { each, get, put } from "../src/store.mjs";
import { VERIFIED_LINES_MAX } from "../src/store-core.mjs";

const bucketOf = (root, address) => join(root, "data/records/event-records", niBucketPath(address));

test("a proven address with altered content is refused after the genuine line was proven", () => {
  const genuine = mkdtempSync(join(tmpdir(), "store-verified-genuine-"));
  const forged = mkdtempSync(join(tmpdir(), "store-verified-forged-"));
  try {
    const address = put(genuine, "event", { n: 1, note: "genuine" });
    assert.deepEqual(get(genuine, "event", address), { n: 1, note: "genuine" });
    assert.deepEqual(get(genuine, "event", address), { n: 1, note: "genuine" });
    const file = bucketOf(forged, address);
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `{"id":"${address}","record":{"n":1,"note":"forged"}}\n`);
    assert.throws(() => get(forged, "event", address), { code: "store-corruption" });
    assert.deepEqual([...each(forged, "event")], []);
  } finally {
    rmSync(genuine, { recursive: true, force: true });
    rmSync(forged, { recursive: true, force: true });
  }
});

test("repeated reads of the same records agree with the first", () => {
  const root = mkdtempSync(join(tmpdir(), "store-verified-repeat-"));
  try {
    const addresses = Array.from({ length: 50 }, (_, n) => put(root, "event", { n }));
    const first = [...each(root, "event")];
    const second = [...each(root, "event")];
    assert.deepEqual(second, first);
    assert.equal(first.length, addresses.length);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the held verdicts have a fixed bound", () => {
  assert.ok(Number.isSafeInteger(VERIFIED_LINES_MAX) && VERIFIED_LINES_MAX > 0 && VERIFIED_LINES_MAX <= 65_536);
});
