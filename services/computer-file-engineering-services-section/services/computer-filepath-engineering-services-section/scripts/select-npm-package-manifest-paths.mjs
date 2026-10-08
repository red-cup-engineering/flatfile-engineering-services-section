import path from "node:path";

/**
 * Selects package.json paths from an explicit supplied path set.
 * @param {object} request - An NpmPackageManifestPathSelectionRequest@1.
 * @returns {object} An immutable NpmPackageManifestPathSelection@1.
 */
export function selectNpmPackageManifestPaths(request) {
  if (
    request === null
    || typeof request !== "object"
    || Array.isArray(request)
    || Object.keys(request).sort().join(",") !== "paths,type,version"
    || request.type !== "NpmPackageManifestPathSelectionRequest"
    || request.version !== 1
    || !Array.isArray(request.paths)
    || request.paths.some((candidate) => typeof candidate !== "string" || candidate.length === 0)
  ) {
    throw new TypeError("request must be an exact NpmPackageManifestPathSelectionRequest@1");
  }
  return Object.freeze({
    type: "NpmPackageManifestPathSelection",
    version: 1,
    paths: request.paths.filter((candidate) => path.basename(candidate) === "package.json"),
  });
}
