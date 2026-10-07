import assert from "node:assert/strict";
import test from "node:test";

import { nonEmptyStringArray, stringArray } from "../src/profile-admission.mjs";

test("stringArray preserves the primitive array admission contract", () => {
  assert.equal(stringArray([]), true);
  assert.equal(stringArray(["evidence"]), true);
  assert.equal(stringArray([""]), false);
  assert.equal(stringArray([0]), false);
  assert.equal(stringArray("evidence"), false);
  assert.equal(stringArray(new Array(1)), true);
});

test("nonEmptyStringArray admits only non-empty arrays of non-empty strings", () => {
  assert.equal(nonEmptyStringArray([]), false);
  assert.equal(nonEmptyStringArray(["evidence"]), true);
  assert.equal(nonEmptyStringArray([""]), false);
  assert.equal(nonEmptyStringArray([0]), false);
  assert.equal(nonEmptyStringArray("evidence"), false);
  assert.equal(nonEmptyStringArray(new Array(1)), true);
});
