import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { admitTextFileCreationProjectionSet } from "../scripts/admit-text-file-creation-projection-set.mjs";

function set(files) {
  return {
    type: "TextFileCreationProjectionSet",
    version: 1,
    files,
    filesDigest: `sha256:${createHash("sha256").update(serializeLines(files)).digest("hex")}`,
  };
}

const first = { type: "TextFileCreationProjection", version: 1, path: "a.txt", text: "a\n", mode: 0o644 };
const second = { type: "TextFileCreationProjection", version: 1, path: "b/run", text: "b\n", mode: 0o755 };

test("admits ordered files and their canonical NDJSON digest", () => {
  const admitted = admitTextFileCreationProjectionSet(set([first, second]));
  assert.equal(admitted.type, "TextFileCreationProjectionSet");
  assert.ok(Object.isFrozen(admitted.files));
});

test("refuses false digests, order changes, duplicates, and file-directory collisions", () => {
  assert.equal(admitTextFileCreationProjectionSet({ ...set([first]), filesDigest: "sha256:false" }).code, "FILES_DIGEST_MISMATCH");
  assert.equal(admitTextFileCreationProjectionSet(set([second, first])).code, "NONCANONICAL_FILE_ORDER");
  assert.equal(admitTextFileCreationProjectionSet(set([first, first])).code, "DUPLICATE_PATH");
  const ancestor = { ...first, path: "b" };
  assert.equal(admitTextFileCreationProjectionSet(set([ancestor, second])).code, "FILE_DIRECTORY_COLLISION");
});
