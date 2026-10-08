import assert from "node:assert/strict";
import test from "node:test";
import { applyMarkdownEdit, markdownEditRequestKind } from "../src/apply-markdown-edit.mjs";

function request(operations) {
  return { kind: markdownEditRequestKind, operations };
}

test("appends body text and reports a changed receipt", () => {
  const { text, receipt } = applyMarkdownEdit("---\ntitle: Doc\n---\nbody", request([{ operation: "append-body", text: "more" }]));
  assert.match(text, /body.*more$/su);
  assert.equal(receipt.changed, true);
  assert.equal(receipt.operations, 1);
});

test("sets frontmatter through mutate-markdown-frontmatter-service", () => {
  const { text } = applyMarkdownEdit("---\ntitle: Old\n---\nbody", request([{ operation: "set-frontmatter", frontmatter: { title: "New" } }]));
  assert.match(text, /title: New/u);
});

test("applies a sequence of operations in order", () => {
  const { text } = applyMarkdownEdit("---\ntitle: Doc\n---\nbody", request([
    { operation: "append-body", text: "one" },
    { operation: "append-body", text: "two" },
  ]));
  assert.match(text, /body.*one.*two$/su);
});

test("rejects an unsupported operation name", () => {
  assert.throws(() => applyMarkdownEdit("body", request([{ operation: "not-a-real-operation" }])), TypeError);
});

test("rejects a request that is not the Markdown edit request kind", () => {
  assert.throws(() => applyMarkdownEdit("body", { kind: "something-else", operations: [] }), TypeError);
});
