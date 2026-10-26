import assert from "node:assert/strict";
import test from "node:test";
import { admitOperationWitness, classifyCommand } from "../src/operation-witness.mjs";

const at = "2026-08-30T12:00:00.000Z";

test("admits one operation as one journal-ready event", () => {
  const result = admitOperationWitness({ kind: "file-read", paths: ["src/a.mjs"], trace: "turn:1", inputBytes: 400 }, { at });
  assert.equal(result.event[1], "operation-witness.recorded");
  assert.equal(result.value.estimatedTokens, 100);
  assert.deepEqual(result.value.paths, ["src/a.mjs"]);
});

test("classifies commands without executing them", () => {
  assert.equal(classifyCommand("rg -n hello src"), "file-read");
  assert.equal(classifyCommand("git add src/a.mjs"), "file-write");
});
