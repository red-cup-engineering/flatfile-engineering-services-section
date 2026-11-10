import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileReceiptStore } from "@red-cup-engineering/flatfile-engineering-services-section/file-receipt-store";

test("FILE-RECEIPT-QUICKSTART", t => {
  const root = mkdtempSync(join(tmpdir(), "file-receipt-example-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, "receipts.json");
  const claim = new FileReceiptStore(path).claim("event:example");
  const observed = new FileReceiptStore(path).claim("event:example");
  assert.equal(claim.state, "ACQUIRED");
  assert.equal(observed.state, "EXISTS");
  assert.equal(observed.claim.claimId, claim.claim.claimId);
});
