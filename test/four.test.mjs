import { test } from "node:test";
import assert from "node:assert/strict";
import { knowledgeJoinReading } from "../src/four.mjs";

test("the knowledge join over FOUR: absurd is its bottom, potential and active join to stable, and it is idempotent", () => {
  assert.equal(knowledgeJoinReading("absurd", "potential"), "potential");
  assert.equal(knowledgeJoinReading("potential", "active"), "stable");
  assert.equal(knowledgeJoinReading("potential", "potential"), "potential");
});
