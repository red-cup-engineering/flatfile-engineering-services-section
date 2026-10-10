// Re-reads a stage directory and proves it holds exactly the paths, UTF-8 text, and modes an
// admitted TextFileCreationProjectionSet describes. Formerly @red-cup-engineering/read-text-file-
// creation-stage-service (deleted: its file reads now go through file-services, and directory
// walking goes straight to node:fs, per the file-services consolidation). This copy exists because
// publish-staged-directory-at-absent-path.mjs re-verifies an externally supplied stage record
// (untrusted input, not necessarily a directory this process just created), so it keeps the
// original's full shape/path validation rather than the lighter version
// jsnode-package-services-section inlines for its own freshly minted stage directories.
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { admitTextFileCreationProjectionSet } from "@red-cup-engineering/computer-file-engineering-services-section/admit-text-file-creation-projection-set";
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

class StageReadRefusal extends Error {
  constructor(code, message, refusedPath = null) {
    super(message);
    this.code = code;
    this.refusedPath = refusedPath;
  }
}

function refuse(code, message, refusedPath = null) {
  throw new StageReadRefusal(code, message, refusedPath);
}

async function actualFiles(root) {
  const files = [];
  async function visit(directory, prefix) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const absolutePath = path.join(directory, entry.name);
      const status = await lstat(absolutePath);
      if (status.isSymbolicLink()) refuse("STAGE_SYMLINK", "staged projections must not contain symbolic links", relativePath);
      if (status.isDirectory()) await visit(absolutePath, relativePath);
      else if (status.isFile()) {
        let text;
        try {
          text = await readFileText(absolutePath, { fatal: true });
        } catch {
          refuse("STAGE_NON_UTF8_FILE", "staged text files must contain valid UTF-8", relativePath);
        }
        files.push({ type: "TextFileCreationProjection", version: 1, path: relativePath, text, mode: status.mode & 0o777 });
      } else refuse("STAGE_SPECIAL_FILE", "staged projections must contain only directories and regular files", relativePath);
    }
  }
  await visit(root, "");
  return files;
}

function refusalRecord(error) {
  if (error instanceof StageReadRefusal) {
    return Object.freeze({
      type: "TextFileCreationStageReadRefusal",
      version: 1,
      code: error.code,
      message: error.message,
      path: error.refusedPath,
    });
  }
  throw error;
}

async function readStage(candidate) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) refuse("INVALID_STAGE", "input must be a TextFileCreationStage record");
  if (Object.keys(candidate).sort().join(",") !== "files,filesDigest,stageDirectory,type,version") {
    refuse("UNEXPECTED_FIELDS", "stage must carry exactly files, filesDigest, stageDirectory, type, and version");
  }
  if (candidate.type !== "TextFileCreationStage" || candidate.version !== 1) refuse("INVALID_STAGE", "stage type and version must be TextFileCreationStage@1");
  if (typeof candidate.stageDirectory !== "string" || !path.isAbsolute(candidate.stageDirectory) || path.resolve(candidate.stageDirectory) !== candidate.stageDirectory) {
    refuse("INVALID_STAGE_DIRECTORY", "stageDirectory must be an absolute normalized path");
  }
  let status;
  try {
    status = await lstat(candidate.stageDirectory);
  } catch (error) {
    if (error?.code === "ENOENT") refuse("MISSING_STAGE", "stageDirectory does not exist", candidate.stageDirectory);
    throw error;
  }
  if (!status.isDirectory() || status.isSymbolicLink()) refuse("INVALID_STAGE_DIRECTORY", "stageDirectory must be a non-symbolic-link directory", candidate.stageDirectory);
  const expected = admitTextFileCreationProjectionSet({
    type: "TextFileCreationProjectionSet",
    version: 1,
    files: candidate.files,
    filesDigest: candidate.filesDigest,
  });
  if (expected.type !== "TextFileCreationProjectionSet") refuse(expected.code, expected.message, expected.path);
  const observedFiles = await actualFiles(candidate.stageDirectory);
  const observedDigest = sha256Digest(serializeLines(observedFiles));
  const observed = admitTextFileCreationProjectionSet({
    type: "TextFileCreationProjectionSet",
    version: 1,
    files: observedFiles,
    filesDigest: observedDigest,
  });
  if (observed.type !== "TextFileCreationProjectionSet") refuse(observed.code, observed.message, observed.path);
  if (serializeLines(observed.files) !== serializeLines(expected.files)) {
    refuse("STAGE_CONTENT_MISMATCH", "staged paths, text, or modes differ from their projections", candidate.stageDirectory);
  }
  const fileDigests = observed.files.map((file) => Object.freeze({
    type: "TextFileMaterialization",
    version: 1,
    path: file.path,
    mode: file.mode,
    digest: sha256Digest(file.text),
  }));
  return Object.freeze({
    type: "TextFileCreationStageRead",
    version: 1,
    stageDirectory: candidate.stageDirectory,
    files: observed.files,
    filesDigest: observed.filesDigest,
    fileDigests,
  });
}

/**
 * Reads a staged directory and proves that its exact paths, UTF-8 text, modes, and digest match their projections.
 *
 * @param {object} stage A TextFileCreationStage record.
 * @returns {Promise<object>} A TextFileCreationStageRead or a specific refusal record.
 */
export async function readTextFileCreationStage(stage) {
  try {
    return await readStage(stage);
  } catch (error) {
    return refusalRecord(error);
  }
}
