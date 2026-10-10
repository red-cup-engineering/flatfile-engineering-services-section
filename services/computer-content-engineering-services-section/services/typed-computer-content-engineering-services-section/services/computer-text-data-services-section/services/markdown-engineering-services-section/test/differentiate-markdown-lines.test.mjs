import assert from "node:assert/strict";
import test from "node:test";
import { differentiateMarkdownLines } from "../src/differentiate-markdown-lines.mjs";

test("reports no changes for identical text", () => {
  const changes = differentiateMarkdownLines("a\nb\n", "a\nb\n");
  assert.ok(changes.every((change) => change.kind !== "add" && change.kind !== "remove"));
});

test("reports an added and a changed line with 1-based positions", () => {
  const changes = differentiateMarkdownLines("a\nb\n", "a\nb\nc\n");
  const added = changes.find((change) => change.text === "c");
  assert.ok(added);
  assert.equal(added.afterLine, 3);
});

test("normalizes CRLF and a missing trailing newline the same as LF", () => {
  assert.deepEqual(differentiateMarkdownLines("a\r\nb", "a\nb\n"), differentiateMarkdownLines("a\nb\n", "a\nb\n"));
});

test("rejects non-string input", () => {
  assert.throws(() => differentiateMarkdownLines(1, "text"), TypeError);
  assert.throws(() => differentiateMarkdownLines("text", null), TypeError);
});
