import assert from "node:assert/strict";
import test from "node:test";

import { projectRegularFilePaths } from "../scripts/project-regular-file-paths.mjs";

test("projects only regular-file paths in observed order", () => {
  const paths = projectRegularFilePaths({
    type: "PosixPathWalk",
    files: [
      { path: "a", kind: "file" },
      { path: "b", kind: "symlink" },
      { path: "c", kind: "file" },
    ],
  });
  assert.deepEqual(paths, ["a", "c"]);
  assert.equal(Object.isFrozen(paths), true);
});
