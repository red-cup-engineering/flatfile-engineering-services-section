import path from "node:path";

/**
 * Projects an explicit npm package directory carrier to its package.json path.
 * @param {object} directory - An NpmPackageDirectory@1.
 * @returns {object} An immutable NpmPackageManifestPathProjection@1.
 */
export function projectNpmPackageManifestPath(directory) {
  if (
    directory === null
    || typeof directory !== "object"
    || Array.isArray(directory)
    || Object.keys(directory).sort().join(",") !== "path,type,version"
    || directory.type !== "NpmPackageDirectory"
    || directory.version !== 1
    || typeof directory.path !== "string"
    || !path.isAbsolute(directory.path)
    || path.resolve(directory.path) !== directory.path
  ) {
    throw new TypeError("directory must be an exact NpmPackageDirectory@1 with an absolute normalized path");
  }
  return Object.freeze({
    type: "NpmPackageManifestPathProjection",
    version: 1,
    directory,
    path: path.join(directory.path, "package.json"),
  });
}
