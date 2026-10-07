import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const cli = fileURLToPath(
  new URL("../apps/json-schema-cli.mjs", import.meta.url),
);
test("NDJSON validation processes multiple requests in one chunk and retains null", () => {
  const requests = [
    { instance: null, schema: { type: "null" } },
    { instance: 7, schema: { type: "string" } },
  ];
  const result = spawnSync(process.execPath, [cli, "validate-instance"], {
    input: requests.map(JSON.stringify).join("\n") + "\n",
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const values = result.stdout.trim().split("\n").map(JSON.parse);
  assert.equal(values.length, 2);
  assert.equal(values[0].ok, true);
  assert.equal(values[1].ok, false);
});
test("unknown CLI operation fails", () => {
  const result = spawnSync(process.execPath, [cli, "nope"], {
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown verb/);
});
