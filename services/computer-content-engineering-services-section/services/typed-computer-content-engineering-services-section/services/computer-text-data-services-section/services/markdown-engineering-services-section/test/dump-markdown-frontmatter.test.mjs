import assert from "node:assert/strict";
import test from "node:test";

import { dumpMarkdownFrontmatter } from "../src/dump-markdown-frontmatter.mjs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";

test("dumps a YAML fence that reads back to the same frontmatter and body", () => {
  const frontmatter = { title: "Example", tags: ["a", "b"], "date-created": "2026-03-04" };
  const text = dumpMarkdownFrontmatter(frontmatter, "Body.\n");
  assert.match(text, /^---\n/);
  const parsed = readMarkdownFrontmatter(text);
  assert.deepEqual(parsed.frontmatter, frontmatter);
  assert.equal(parsed.body, "Body.\n");
});

test("dumps a TOML fence that reads back to the same frontmatter and body", () => {
  const frontmatter = { title: "Example", count: 3 };
  const text = dumpMarkdownFrontmatter(frontmatter, "Body.\n", "toml");
  assert.match(text, /^\+\+\+\n/);
  const parsed = readMarkdownFrontmatter(text, { frontmatterFormats: ["toml"] });
  assert.deepEqual(parsed.frontmatter, frontmatter);
  assert.equal(parsed.body, "Body.\n");
});

test("null, undefined, or empty frontmatter writes no fence", () => {
  assert.equal(dumpMarkdownFrontmatter(null, "Body.\n"), "Body.\n");
  assert.equal(dumpMarkdownFrontmatter(undefined, "Body.\n"), "Body.\n");
  assert.equal(dumpMarkdownFrontmatter({}, "Body.\n"), "Body.\n");
});

test("refuses a non-object frontmatter, a non-string body, and an unknown format", () => {
  assert.throws(() => dumpMarkdownFrontmatter("nope", "Body.\n"), TypeError);
  assert.throws(() => dumpMarkdownFrontmatter([1, 2], "Body.\n"), TypeError);
  assert.throws(() => dumpMarkdownFrontmatter({ a: 1 }, 5), TypeError);
  assert.throws(() => dumpMarkdownFrontmatter({ a: 1 }, "Body.\n", "json"), TypeError);
});
