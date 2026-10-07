import { execFile } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { readTextFileCreationStage } from "./read-text-file-creation-stage.mjs";

const execute = promisify(execFile);

function refusal(code, message, refusedPath = null) {
  return freezeJson({ type: "StagedDirectoryPublicationRefusal", version: 1, code, message, path: refusedPath });
}

async function exists(candidate) {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Re-reads a proven stage and atomically renames it to a never-overwritten sibling destination.
 *
 * @param {object} request A StagedDirectoryPublicationRequest.
 * @returns {Promise<object>} A TextFileCreationMaterializationReceipt or a specific refusal record.
 */
export async function publishStagedDirectoryAtAbsentPath(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) return refusal("INVALID_REQUEST", "input must be a StagedDirectoryPublicationRequest");
  if (Object.keys(request).sort().join(",") !== "destination,stage,type,version") return refusal("UNEXPECTED_FIELDS", "request must carry exactly destination, stage, type, and version");
  if (request.type !== "StagedDirectoryPublicationRequest" || request.version !== 1) return refusal("INVALID_REQUEST", "request type and version must be StagedDirectoryPublicationRequest@1");
  if (typeof request.destination !== "string" || !path.isAbsolute(request.destination) || path.resolve(request.destination) !== request.destination) {
    return refusal("INVALID_DESTINATION", "destination must be an absolute normalized path");
  }
  const stage = request.stage;
  if (stage?.type !== "TextFileCreationStageRead" || stage.version !== 1) return refusal("INVALID_STAGE", "stage must be a TextFileCreationStageRead@1");
  const reread = await readTextFileCreationStage({
    type: "TextFileCreationStage",
    version: 1,
    stageDirectory: stage.stageDirectory,
    files: stage.files,
    filesDigest: stage.filesDigest,
  });
  if (reread.type !== "TextFileCreationStageRead") return refusal("STAGE_CHANGED", reread.message, reread.path);
  if (path.dirname(stage.stageDirectory) !== path.dirname(request.destination)) {
    return refusal("NONATOMIC_DESTINATION", "stage and destination must be siblings on the same filesystem", request.destination);
  }
  const parent = path.dirname(request.destination);
  if (await realpath(parent) !== parent) return refusal("INVALID_DESTINATION_PARENT", "destination parent must be canonical and free of symlink redirection", parent);
  if (await exists(request.destination)) return refusal("DESTINATION_EXISTS", "destination already exists and will not be overwritten", request.destination);
  try {
    await execute("mv", ["--no-clobber", "--no-copy", "--no-target-directory", stage.stageDirectory, request.destination]);
  } catch (error) {
    return refusal("ATOMIC_RENAME_FAILED", error.stderr || error.message, request.destination);
  }
  if (await exists(stage.stageDirectory)) return refusal("DESTINATION_EXISTS", "destination appeared before atomic publication and was not overwritten", request.destination);
  if (!(await exists(request.destination))) return refusal("ATOMIC_RENAME_FAILED", "atomic publication produced neither stage nor destination", request.destination);
  return freezeJson({
    type: "TextFileCreationMaterializationReceipt",
    version: 1,
    destination: request.destination,
    filesDigest: reread.filesDigest,
    files: reread.fileDigests,
  });
}

export const operation = Object.freeze({ name: "publish-staged-directory-at-absent-path", description: "Re-reads a proven stage and atomically renames it to a never-overwritten sibling destination.", operation: publishStagedDirectoryAtAbsentPath });
