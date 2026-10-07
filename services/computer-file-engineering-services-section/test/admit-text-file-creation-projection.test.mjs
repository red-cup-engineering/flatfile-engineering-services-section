import assert from "node:assert/strict";
import test from "node:test";
import { admitTextFileCreationProjection, operation } from "../scripts/admit-text-file-creation-projection.mjs";

const projection = Object.freeze({
  type: "TextFileCreationProjection",
  version: 1,
  path: "scripts/example.mjs",
  text: "export {};\n",
  mode: 0o755,
});

test("admits a complete immutable text-file creation projection", () => {
  const admitted = admitTextFileCreationProjection(projection);
  assert.deepEqual(admitted, projection);
  assert.ok(Object.isFrozen(admitted));
});

test("returns path, text, and mode refusals in the same output vocabulary", () => {
  assert.equal(admitTextFileCreationProjection({ ...projection, path: "../x" }).code, "INVALID_PATH");
  assert.equal(admitTextFileCreationProjection({ ...projection, text: null }).code, "INVALID_TEXT");
  assert.equal(admitTextFileCreationProjection({ ...projection, mode: 0o1000 }).code, "INVALID_MODE");
});

test("the declared operation answers projections with admitted or refused records", () => {
  assert.equal(operation.operation(projection).type, "TextFileCreationProjection");
  const refused = operation.operation({ ...projection, path: "../x" });
  assert.equal(refused.type, "TextFileCreationProjectionRefusal");
  assert.equal(refused.code, "INVALID_PATH");
});
