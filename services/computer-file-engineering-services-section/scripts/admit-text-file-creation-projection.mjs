import { freezeJson } from "@red-cup-engineering/json-services-section";
import { admitRelativePosixFilepath } from "@red-cup-engineering/computer-filepath-engineering-services-section/admit-relative-posix-filepath";

function refusal(code, message, path = null) {
  return freezeJson({ type: "TextFileCreationProjectionRefusal", version: 1, code, message, path });
}

/**
 * Admits the complete future content, relative path, and portable mode of one absent text file.
 *
 * @param {object} candidate A TextFileCreationProjection candidate.
 * @returns {object} An immutable TextFileCreationProjection or a specific refusal record.
 */
export function admitTextFileCreationProjection(candidate) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return refusal("INVALID_PROJECTION", "input must be a TextFileCreationProjection record");
  }
  const keys = Object.keys(candidate).sort();
  if (keys.join(",") !== "mode,path,text,type,version") {
    return refusal("UNEXPECTED_FIELDS", "projection must carry exactly mode, path, text, type, and version");
  }
  if (candidate.type !== "TextFileCreationProjection" || candidate.version !== 1) {
    return refusal("INVALID_PROJECTION", "projection type and version must be TextFileCreationProjection@1");
  }
  let admittedPath;
  try {
    admittedPath = admitRelativePosixFilepath(candidate.path);
  } catch (error) {
    return refusal("INVALID_PATH", error.message, typeof candidate.path === "string" ? candidate.path : null);
  }
  if (typeof candidate.text !== "string") return refusal("INVALID_TEXT", "projection.text must be a string", admittedPath);
  if (!Number.isInteger(candidate.mode) || candidate.mode < 0 || candidate.mode > 0o777) {
    return refusal("INVALID_MODE", "projection.mode must be an integer from 0 through 0o777", admittedPath);
  }
  return freezeJson({
    type: "TextFileCreationProjection",
    version: 1,
    path: admittedPath,
    text: candidate.text,
    mode: candidate.mode,
  });
}

export const operation = Object.freeze({ name: "admit-text-file-creation-projection", description: "Admits the complete future content, relative path, and portable mode of one absent text file.", operation: admitTextFileCreationProjection });
