import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FileReceiptStore } from "../src/file-receipt-store.mjs";
test("durable claim is shared by independent receipt-store instances", () => {
  const dir = mkdtempSync(join(tmpdir(), "github-settler-"));
  try {
    const path = join(dir, "receipts.json");
    const first = new FileReceiptStore(path);
    const second = new FileReceiptStore(path);
    const acquired = first.claim("event:claim");
    const observed = second.claim("event:claim");
    assert.equal(acquired.state, "ACQUIRED");
    assert.equal(observed.state, "EXISTS");
    assert.equal(observed.claim.claimId, acquired.claim.claimId);
    assert.throws(() => second.clearClaim("event:claim", "other"), /ownership mismatch/u);
    assert.equal(first.clearClaim("event:claim", acquired.claim.claimId), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

