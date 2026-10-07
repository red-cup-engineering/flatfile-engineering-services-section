import assert from "node:assert/strict";
import test from "node:test";
import { statPath } from "../scripts/stat-path.mjs";
import { tmpdir } from "node:os";
import { mkdir, writeFile, rm } from "node:fs/promises";
test("reports a file, a directory, and an absent path", async () => {
  const root = `${tmpdir()}/561-stat-path-test-${process.pid}`;
  await mkdir(root, { recursive: true });
  await writeFile(`${root}/f.txt`, "abc");
  const file = await statPath({ path: `${root}/f.txt` });
  assert.equal(file.kind, "file"); assert.equal(file.size, 3); assert.equal(file.exists, true); assert.equal(typeof file.mtimeMs, "number");
  assert.equal((await statPath({ path: root })).kind, "directory");
  assert.deepEqual(await statPath({ path: `${root}/none` }), { type: "PathStat", path: `${root}/none`, exists: false, kind: "absent", size: null, mtimeMs: null });
  await rm(root, { recursive: true, force: true });
});
test("refuses a missing path", async () => { await assert.rejects(() => statPath({}), /a non-empty path is required/u); });
