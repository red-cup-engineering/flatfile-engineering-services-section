import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { journalWitness } from "../src/journal/event.mjs";
import {
  clearSegmentIndexes, feedLedgerEnd, foldSegmentStatements, projectSegmentStatements,
  segmentAdmit, segmentLimits, segmentPath, segmentStatements,
} from "../src/journal/filesystem/segment-store.mjs";

const witness = (n) => journalWitness({
  kind: "metroplat.journal.observation", seat: "urn:test:ledger-race", claim: tm.mark("ledger"),
  address: tm.mark("held"), time: `2026-10-08T00:00:0${n}.000Z`, causes: [], payload: { n },
});
const readers = {
  statements: log => segmentStatements(log).map(statement => statement.id),
  projection: log => projectSegmentStatements(log, statement => statement.id),
  "streamed fold": log => {
    const ids = [];
    foldSegmentStatements(log, [], statement => ids.push(statement.id));
    return ids;
  },
};
function fixture(run) {
  const directory = fs.mkdtempSync(join(tmpdir(), "journal-ledger-race-"));
  const log = join(directory, "data/journals/2026/10/08/2026-10-08-admit-feed.jsonl");
  const streamedBytes = segmentLimits.streamedBytes;
  const statSync = fs.statSync;
  try {
    const first = witness(1), second = witness(2);
    segmentAdmit(log, [first]);
    clearSegmentIndexes();
    // Force fold through its streaming branch, not its segmentStatements fallback.
    segmentLimits.streamedBytes = 1;
    run({ log, first, second, statSync });
  } finally {
    fs.statSync = statSync;
    segmentLimits.streamedBytes = streamedBytes;
    clearSegmentIndexes();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

for (const [name, read] of Object.entries(readers)) {
  test(`${name}: an append after the reader's stat is not witness loss`, () => fixture(({ log, first, second, statSync }) => {
    let interleaved = false;
    // Deterministically schedule a real provider admission between the reader's
    // initial physical stat and its ledger read. Return the real earlier stat.
    fs.statSync = (file, ...options) => {
      const earlier = statSync(file, ...options);
      if (!interleaved && file === segmentPath(log)) {
        interleaved = true;
        fs.statSync = statSync;
        assert.equal(segmentAdmit(log, [second])[0].admission, "admitted");
        assert.ok(feedLedgerEnd(log) > earlier.size);
        assert.equal(statSync(file).size, feedLedgerEnd(log));
      }
      return earlier;
    };
    const ids = read(log);
    assert.equal(interleaved, true);
    assert.deepEqual([...ids].sort(), [first.id, second.id].sort());
    assert.deepEqual([...read(log)].sort(), [first.id, second.id].sort(), "later reads retain both admissions");
  }));

  for (const loss of ["truncated", "missing"]) {
    test(`${name}: a genuinely ${loss} segment still fails closed`, () => fixture(({ log, second }) => {
      segmentAdmit(log, [second]);
      const bytes = fs.readFileSync(segmentPath(log));
      const admittedEnd = feedLedgerEnd(log);
      if (loss === "missing") fs.rmSync(segmentPath(log));
      else fs.writeFileSync(segmentPath(log), bytes.subarray(0, bytes.indexOf(10) + 1));
      clearSegmentIndexes();
      assert.equal(feedLedgerEnd(log), admittedEnd, "the ledger retains its admission evidence");
      assert.throws(() => read(log), error => error instanceof TypeError && /lacks witnesses admitted into it/u.test(error.message));
    }));
  }
}
