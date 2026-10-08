import assert from "node:assert/strict";
import test from "node:test";
import { projectNpmPackageManifestPath } from "../scripts/project-npm-package-manifest-path.mjs";

const directory = {
  type: "NpmPackageDirectory",
  version: 1,
  path: "/workspace/example",
};

test("projects package.json under the exact directory", () => {
  assert.deepEqual(projectNpmPackageManifestPath(directory), {
    type: "NpmPackageManifestPathProjection",
    version: 1,
    directory,
    path: "/workspace/example/package.json",
  });
});

test("refuses relative and inexact directories", () => {
  assert.throws(
    () => projectNpmPackageManifestPath({ ...directory, path: "relative" }),
    TypeError,
  );
});
