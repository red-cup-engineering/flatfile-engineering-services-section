import path from "node:path";

/**
 * Admits one nonempty normalized POSIX filepath that remains beneath an unnamed root.
 * @param {string} value A candidate root-relative filepath.
 * @returns {string} The unchanged admitted filepath.
 * @throws {TypeError} When the value is empty, absolute, non-POSIX, or contains traversal.
 */
export function admitRelativePosixFilepath(value) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError("value must be a nonempty relative POSIX filepath");
  if (
    value.includes("\\") ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    path.posix.normalize(value) !== value ||
    value === "." ||
    value === ".." ||
    value.startsWith("../")
  ) {
    throw new TypeError("value must be a normalized relative POSIX filepath beneath its root");
  }
  return value;
}
