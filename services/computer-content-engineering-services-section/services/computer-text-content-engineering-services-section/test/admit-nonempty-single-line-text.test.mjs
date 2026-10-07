import assert from "node:assert/strict";
import test from "node:test";

import { admitNonemptySingleLineText } from "../src/admit-nonempty-single-line-text.mjs";

test("admits one nonempty line unchanged", () => {
  assert.equal(admitNonemptySingleLineText("one line"), "one line");
});

test("refuses empty and multiline text", () => {
  assert.throws(() => admitNonemptySingleLineText(""), /one nonempty line/u);
  assert.throws(() => admitNonemptySingleLineText("one\ntwo"), /one nonempty line/u);
});
