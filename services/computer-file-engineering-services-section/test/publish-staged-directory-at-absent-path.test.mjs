import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { readTextFileCreationStage } from "../scripts/read-text-file-creation-stage.mjs";
import { publishStagedDirectoryAtAbsentPath } from "../scripts/publish-staged-directory-at-absent-path.mjs";

// Builds a proven TextFileCreationStageRead the way stage-text-file-creation-projections-service
// used to (write each file, then read the directory back and verify it) — inlined here as a test
// fixture now that package is deleted in favor of file-services.
async function stage(parent) {
  const files = [{ type: "TextFileCreationProjection", version: 1, path: "a.txt", text: "a\n", mode: 0o644 }];
  const filesDigest = `sha256:${createHash("sha256").update(serializeLines(files)).digest("hex")}`;
  const stageDirectory = await mkdtemp(path.join(parent, ".text-file-creation-stage-"));
  for (const file of files) {
    const target = path.join(stageDirectory, ...file.path.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFileText(target, file.text, { flag: "wx", mode: file.mode });
  }
  return readTextFileCreationStage({ type: "TextFileCreationStage", version: 1, stageDirectory, files, filesDigest });
}

test("atomically publishes a proven stage and returns the creation receipt", async (t) => {
  const parent = await mkdtemp(path.join("/tmp", "publish-stage-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const staged = await stage(parent);
  const destination = path.join(parent, "created");
  const receipt = await publishStagedDirectoryAtAbsentPath({
    type: "StagedDirectoryPublicationRequest",
    version: 1,
    stage: staged,
    destination,
  });
  assert.equal(receipt.type, "TextFileCreationMaterializationReceipt");
  assert.equal(await readFile(path.join(destination, "a.txt"), "utf8"), "a\n");
  await assert.rejects(access(staged.stageDirectory));
});

test("refuses an occupied destination without altering it or consuming the stage", async (t) => {
  const parent = await mkdtemp(path.join("/tmp", "publish-stage-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const staged = await stage(parent);
  const destination = path.join(parent, "occupied");
  await mkdir(destination);
  await writeFile(path.join(destination, "kept.txt"), "kept\n");
  const result = await publishStagedDirectoryAtAbsentPath({
    type: "StagedDirectoryPublicationRequest",
    version: 1,
    stage: staged,
    destination,
  });
  assert.equal(result.code, "DESTINATION_EXISTS");
  assert.equal(await readFile(path.join(destination, "kept.txt"), "utf8"), "kept\n");
  await access(staged.stageDirectory);
});

test("refuses a changed stage before publication", async (t) => {
  const parent = await mkdtemp(path.join("/tmp", "publish-stage-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const staged = await stage(parent);
  await writeFile(path.join(staged.stageDirectory, "a.txt"), "changed\n");
  const result = await publishStagedDirectoryAtAbsentPath({
    type: "StagedDirectoryPublicationRequest",
    version: 1,
    stage: staged,
    destination: path.join(parent, "created"),
  });
  assert.equal(result.code, "STAGE_CHANGED");
});
