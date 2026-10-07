import assert from "node:assert/strict";
import test from "node:test";
import { admitRelativePosixFilepath } from "../scripts/admit-relative-posix-filepath.mjs";

test("admits normalized paths beneath an unnamed root", () => {
  assert.equal(admitRelativePosixFilepath("scripts/example.mjs"), "scripts/example.mjs");
  assert.equal(admitRelativePosixFilepath("package.json"), "package.json");
});

test("refuses empty, absolute, traversing, noncanonical, and non-POSIX paths", () => {
  for (const value of ["", ".", "..", "../x", "/x", "x/../y", "x//y", "x\\y", "x\0y"]) {
    assert.throws(() => admitRelativePosixFilepath(value), TypeError, value);
  }
});
