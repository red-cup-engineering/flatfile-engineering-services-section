import assert from "node:assert/strict";
import test from "node:test";
import { selectNpmPackageManifestPaths } from "../scripts/select-npm-package-manifest-paths.mjs";

const request = {
  type: "NpmPackageManifestPathSelectionRequest",
  version: 1,
  paths: ["/a/package.json", "/a/readme.md", "/b/package.json"],
};

test("selects only package.json paths without reading them", () => {
  assert.deepEqual(selectNpmPackageManifestPaths(request), {
    type: "NpmPackageManifestPathSelection",
    version: 1,
    paths: ["/a/package.json", "/b/package.json"],
  });
});
