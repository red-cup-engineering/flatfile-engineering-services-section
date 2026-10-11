import { freezeJson } from "@red-cup-engineering/json-services-section";
import { parseLines, serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { admitTextFileCreationProjection } from "@red-cup-engineering/computer-file-engineering-services-section/admit-text-file-creation-projection";
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

function refusal(code, message, path = null) {
  return freezeJson({ type: "TextFileCreationProjectionSetRefusal", version: 1, code, message, path });
}

function isPathAncestor(ancestor, descendant) {
  return descendant.startsWith(`${ancestor}/`);
}

/**
 * Admits one complete ordered set of future text files and its canonical NDJSON digest.
 *
 * @param {object} candidate A TextFileCreationProjectionSet candidate.
 * @returns {object} An immutable admitted set or a specific refusal record.
 */
export function admitTextFileCreationProjectionSet(candidate) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return refusal("INVALID_SET", "input must be a TextFileCreationProjectionSet record");
  }
  if (Object.keys(candidate).sort().join(",") !== "files,filesDigest,type,version") {
    return refusal("UNEXPECTED_FIELDS", "set must carry exactly files, filesDigest, type, and version");
  }
  if (candidate.type !== "TextFileCreationProjectionSet" || candidate.version !== 1 || !Array.isArray(candidate.files) || candidate.files.length === 0) {
    return refusal("INVALID_SET", "set type and version must be TextFileCreationProjectionSet@1 with nonempty files");
  }
  const files = [];
  let priorPath = null;
  for (const value of candidate.files) {
    const file = admitTextFileCreationProjection(value);
    if (file.type !== "TextFileCreationProjection") return refusal("INVALID_FILE", file.message, file.path);
    if (priorPath !== null && priorPath.localeCompare(file.path) >= 0) {
      return refusal(priorPath === file.path ? "DUPLICATE_PATH" : "NONCANONICAL_FILE_ORDER", "files must have unique paths in ascending order", file.path);
    }
    files.push(file);
    priorPath = file.path;
  }
  for (let index = 0; index < files.length; index += 1) {
    for (let later = index + 1; later < files.length; later += 1) {
      if (isPathAncestor(files[index].path, files[later].path)) {
        return refusal("FILE_DIRECTORY_COLLISION", "one projected file path cannot be another projected file's directory", files[later].path);
      }
    }
  }
  const filesDigest = sha256Digest(serializeLines(files));
  if (candidate.filesDigest !== filesDigest) return refusal("FILES_DIGEST_MISMATCH", "filesDigest does not identify the ordered file records");
  return freezeJson({ type: "TextFileCreationProjectionSet", version: 1, files, filesDigest });
}

export const operation = Object.freeze({ name: "admit-text-file-creation-projection-set", description: "Admits one complete ordered set of future text files and its canonical NDJSON digest.", operation: admitTextFileCreationProjectionSet });
