import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("the EAVT app processes successive requests and continues after malformed input", () => {
  const command = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../apps/eavt.mjs", import.meta.url))],
    {
      input:
        '{"operation":"entities","rows":[{"e":"a","a":"p","v":1,"t":1}]}\ninvalid\n{"operation":"entities","rows":[]}\n',
      encoding: "utf8",
    },
  );
  assert.equal(command.status, 0, command.stderr);
  const responses = command.stdout.trim().split("\n").map(JSON.parse);
  assert.deepEqual(responses[0], { ok: true, value: ["a"] });
  assert.equal(responses[1].ok, false);
  assert.deepEqual(responses[2], { ok: true, value: [] });
});
