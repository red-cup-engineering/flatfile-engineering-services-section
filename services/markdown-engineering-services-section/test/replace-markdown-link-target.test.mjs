import assert from "node:assert/strict";
import test from "node:test";

import { replaceMarkdownLinkTarget } from "../src/replace-markdown-link-target.mjs";

test("replaces every exact semantic target and reports original source spans", () => {
  const source = "See [Alpha](alpha.md \"title\") and ![map](alpha.md).";
  const result = replaceMarkdownLinkTarget(source, { target: "alpha.md", replacement: "beta.md" });
  assert.equal(result.text, "See [Alpha](beta.md \"title\") and ![map](beta.md).");
  assert.equal(result.count, 2);
  const first = source.indexOf("alpha.md");
  const second = source.indexOf("alpha.md", first + 1);
  assert.deepEqual(result.edits.map(({ span }) => span), [
    { start: first, end: first + 8, text: "alpha.md" },
    { start: second, end: second + 8, text: "alpha.md" },
  ]);
});

test("does not edit escaped, fenced, inline-code, fragment, or merely similar targets", () => {
  const source = [
    "\\[escaped](alpha.md)",
    "~~~",
    "[fenced](alpha.md)",
    "~~~",
    "`[coded](alpha.md)`",
    "[fragment](alpha.md#part)",
    "[real](alpha.md)",
  ].join("\n");
  const result = replaceMarkdownLinkTarget(source, { target: "alpha.md", replacement: "beta.md" });
  assert.equal(result.count, 1);
  assert.match(result.text, /\[real\]\(beta\.md\)$/u);
  assert.match(result.text, /\[fenced\]\(alpha\.md\)/u);
});

test("preserves CRLF bytes around a target and maps its span to the original text", () => {
  const source = "First\r\n[Alpha](alpha.md)\r\nLast\r\n";
  const result = replaceMarkdownLinkTarget(source, { target: "alpha.md", replacement: "beta.md" });
  assert.equal(result.text, "First\r\n[Alpha](beta.md)\r\nLast\r\n");
  assert.deepEqual(result.edits[0].span, {
    start: source.indexOf("alpha.md"),
    end: source.indexOf("alpha.md") + "alpha.md".length,
    text: "alpha.md",
  });
});

test("absent target is a byte-identical no-op", () => {
  const source = "See [Alpha](alpha.md).";
  assert.deepEqual(replaceMarkdownLinkTarget(source, { target: "missing.md", replacement: "beta.md" }), {
    text: source,
    count: 0,
    edits: [],
  });
  assert.throws(() => replaceMarkdownLinkTarget(source, {
    target: "missing.md", replacement: "beta.md", required: true,
  }), /not found/u);
});

test("uses parsed target coordinates while preserving destination padding and title bytes", () => {
  const source = '😀\r\n[](  Second Brain.md  "A title" )\r\n';
  const result = replaceMarkdownLinkTarget(source, { target: 'Second Brain.md', replacement: 'Next.md' });
  assert.equal(result.text, '😀\r\n[](  Next.md  "A title" )\r\n');
  assert.equal(result.edits[0].span.start, source.indexOf('Second Brain.md'));
});
