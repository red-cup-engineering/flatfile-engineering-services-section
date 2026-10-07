import assert from "node:assert/strict";
import test from "node:test";
import { tmpdir } from "node:os";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { findAncestorMarkerFile } from "../scripts/find-ancestor-marker-file.mjs";
test("finds the nearest ancestor holding the marker", async () => {
  const root = `${tmpdir()}/561-find-ancestor-test-${process.pid}`;
  await mkdir(`${root}/pkg/src/deep`, { recursive: true });
  await writeFile(`${root}/pkg/package.json`, "{}");
  const found = await findAncestorMarkerFile({ start: `${root}/pkg/src/deep`, marker: "package.json" });
  assert.equal(found.path, `${root}/pkg`);
  await rm(root, { recursive: true, force: true });
});
test("reports null when no ancestor holds the marker", async () => {
  const found = await findAncestorMarkerFile({ start: "/nonexistent/561-group/a/b", marker: "no-such-marker-file-561" });
  assert.equal(found.path, null);
});
test("refuses missing arguments", async () => { await assert.rejects(() => findAncestorMarkerFile({ start: "/x" }), /a non-empty start and marker are required/u); });
