import assert from "node:assert/strict";
import test from "node:test";
import { readMarkdownFeatures } from "../src/read-markdown-features.mjs";
import { readMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";

test("headings and relations share complete frontmatter and code boundaries", () => {
  const source = [
    "---", "title: '[[metadata]] #metadata'", "---", "# Real",
    "````md", "# Example", "[[example]] #example", "```", "[[still-example]]", "```` trailing", "[[also-example]]", "`````",
    "~~~", "# Tilde example", "[[tilde]]", "~~~~",
    "`` [[inline]] #inline ` embedded `` [[visible]] #visible",
    "`multiline", "[[hidden]]", "code` [real](target.md)",
    "```", "# Unclosed", "[[unclosed]] #unclosed",
  ].join("\r\n");
  assert.deepEqual(readMarkdownStructure(source).headings.map(({title}) => title), ["Real"]);
  const body = source.split("\r\n").slice(3).join("\r\n");
  const features = readMarkdownFeatures(body);
  assert.deepEqual(features.map((f) => f.target ?? f.tag), ["visible", "visible", "target.md"]);
  const normalized = body.replaceAll("\r\n", "\n");
  for (const {span} of features) assert.equal(normalized.slice(span.start, span.end), span.text);
});

test("masking preserves Unicode offsets and callout line boundaries", () => {
  const source = "```\n😀 [[hidden]]\n```\n> [!note] Title\n> body [[visible]]\n\n#tag";
  const features = readMarkdownFeatures(source);
  assert.equal(features.find((f) => f.type === "callout").body, "body [[visible]]");
  const link = features.find((f) => f.type === "wikilink");
  assert.equal(link.span.start, source.indexOf("[[visible]]"));
  assert.equal(features.at(-1).tag, "tag");
});

test("retains empty labels, spaced destinations, images, aliases and transclusions", () => {
  const features = readMarkdownFeatures('[](Second Brain.md) ![figure](image.png "caption") [[note#part|Alias]] ![[embed]]');
  assert.deepEqual(features.map(({type,target}) => [type,target]), [
    ["markdown-link", "Second Brain.md"], ["markdown-link", "image.png"], ["wikilink", "note#part"], ["transclusion", "embed"],
  ]);
  assert.equal(features[1].title, "caption");
  assert.equal(features[1].image, true);
  assert.equal(features[2].label, "Alias");
});

test("unmatched and escaped backticks do not conceal actual prose", () => {
  assert.deepEqual(readMarkdownFeatures('` unmatched [[one]] \\` [[two]]').map(({target}) => target), ["two"]);
  // A backslash is literal inside code: the later run closes the first span.
  assert.deepEqual(readMarkdownFeatures('\\` [[visible]]').map(({target}) => target), ["visible"]);
  assert.deepEqual(readMarkdownFeatures('` [[visible]]').map(({target}) => target), ["visible"]);
});

test("body thematic breaks are not read as a second frontmatter envelope", () => {
  const features = readMarkdownFeatures("---\n[[between]]\n---\n[[after]]");
  assert.deepEqual(features.map(({target}) => target), ["between", "after"]);
});

test("inline delimiters cannot hide a new paragraph or heading", () => {
  assert.deepEqual(readMarkdownFeatures("`example\n\n[[visible]] `").map(({target}) => target), ["visible"]);
  assert.deepEqual(readMarkdownFeatures("`example\n# [[visible]] `").map(({target}) => target), ["visible"]);
});

test("source spans retain inline code in link labels and destinations", () => {
  const text = '[a `b`](note.md "a `title`") [[other|a `label`]]';
  const features = readMarkdownFeatures(text);
  assert.equal(features[0].label, 'a `b`');
  assert.equal(features[0].labelSpan.text, 'a `b`');
  assert.equal(features[0].title, 'a `title`');
  assert.equal(features[1].label, 'a `label`');
});
