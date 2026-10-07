import { stat } from "node:fs/promises";

/**
 * Observes one path and reports whether it exists, its kind, size, and modification time.
 * @param {object} request A record with the path to observe.
 * @returns {Promise<object>} A PathStat record.
 * @throws {TypeError} When path is not a non-empty string.
 */
export async function statPath(request) {
  if (typeof request?.path !== "string" || request.path.length === 0) throw new TypeError("a non-empty path is required");
  try {
    const observed = await stat(request.path);
    const kind = observed.isFile() ? "file" : observed.isDirectory() ? "directory" : observed.isSymbolicLink() ? "symlink" : "other";
    return { type: "PathStat", path: request.path, exists: true, kind, size: observed.size, mtimeMs: observed.mtimeMs };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return { type: "PathStat", path: request.path, exists: false, kind: "absent", size: null, mtimeMs: null };
    throw error;
  }
}

export const operation = Object.freeze({ name: "stat-path", description: "Observes one path and reports whether it exists, its kind, size, and modification time.", operation: statPath });
