import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

let installed = true;
try { import.meta.resolve("@red-cup-engineering/json-services-section/differentiate-data"); } catch { installed = false; }
const skip = installed ? false : "workspace dependencies are not installed";

const bin = (name) => fileURLToPath(new URL(`../bin/${name}.mjs`, import.meta.url));

test("differentiate-data reads one JSON request from stdin and writes its change list", { skip }, () => {
  const run = spawnSync(process.execPath, [bin("differentiate-data")], {
    input: JSON.stringify({ before: { a: 1 }, after: { a: 2 } }),
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), [{ path: "a", kind: "changed", before: 1, after: 2 }]);
});

test("a command refuses a malformed request with a nonzero exit", { skip }, () => {
  const run = spawnSync(process.execPath, [bin("differentiate-data")], { input: "{}", encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /before and after/u);
});
