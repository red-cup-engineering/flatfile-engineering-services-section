import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readTextFile } from "../scripts/read-text-file.mjs";
import { requireTextFileRead } from "../src/require-text-file-read.mjs";

test("reads UTF-8 text while retaining the resolved filepath", async () => {
  const directory = await mkdtemp(join(tmpdir(), "read-text-file-"));
  try {
    const path = join(directory, "example.mjs");
    await writeFile(path, "export {};\n", "utf8");
    assert.deepEqual(await readTextFile({ path }), { type: "TextFileRead", path, text: "export {};\n" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("admits the shared TextFileRead shape and reserves exact keys for leaf policy", () => {
  const reading = { type: "TextFileRead", path: "example.mjs", text: "export {};", metadata: true };
  assert.equal(requireTextFileRead(reading), reading);
  assert.throws(() => requireTextFileRead(reading, { exactKeys: true }), /exactly path, text, and type/u);
  assert.throws(() => requireTextFileRead({ path: "example.mjs", text: "export {};" }), /TextFileRead/u);
});
