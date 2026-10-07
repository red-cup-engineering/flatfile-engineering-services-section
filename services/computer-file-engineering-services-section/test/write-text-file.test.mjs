import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeTextFile } from "../scripts/write-text-file.mjs";

test("writes a text-file carrier and returns its receipt", async () => {
  const directory = await mkdtemp(join(tmpdir(), "write-text-file-"));
  try {
    const path = join(directory, "example.mjs");
    assert.deepEqual(await writeTextFile({ path, text: "export {};\n" }), {
      type: "TextFileWrite",
      path,
      bytes: 11,
    });
    assert.equal(await readFile(path, "utf8"), "export {};\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
