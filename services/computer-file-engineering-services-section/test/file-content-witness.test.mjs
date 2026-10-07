import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { observeFileContentWitnesses } from "../src/file-content-witness.mjs";

test("observes explicit existing and missing files and refuses root escape", async () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), "file-witness-")); writeFileSync(join(rootDirectory, "a.txt"), "hello");
  const result = await observeFileContentWitnesses({ rootDirectory, relativePaths: ["missing", "a.txt", "a.txt"] });
  assert.equal(result.count, 2); assert.equal(result.files.find(({ path }) => path === "a.txt").bytes, 5); assert.equal(result.files.find(({ path }) => path === "missing").exists, false);
  await assert.rejects(() => observeFileContentWitnesses({ rootDirectory, relativePaths: ["../outside"] }), /escapes rootDirectory/u);
});
