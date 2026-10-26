import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
test("witness-journal command appends generic EAVT and reads state", () => {
  const root = mkdtempSync(path.join(tmpdir(), "eavt-cli-"));
  try {
    const app = new URL("../apps/witness-journal.mjs", import.meta.url);
    const at = "2026-09-20";
    const result = spawnSync(
      process.execPath,
      [
        app.pathname,
        "append-entries",
        "--root",
        root,
        "--feed",
        "events",
        "--at",
        at,
      ],
      {
        input: JSON.stringify([{ e: "s", a: "p", v: 1, t: at }]),
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).appended, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
