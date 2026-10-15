import assert from "node:assert/strict";
import test from "node:test";

import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";

test("reads YAML frontmatter and preserves the Markdown body", () => {
  const result = readMarkdownFrontmatter("---\ntitle: Example\ndate-created: 2026-03-04\n---\nBody.\n");
  assert.deepEqual(result.frontmatter, { title: "Example", "date-created": "2026-03-04" });
  assert.equal(result.body, "Body.\n");
  assert.equal(result.format, "yaml");
});

test("reads a YAML flow mapping between YAML fences", () => {
  const text =
    '---\n{"dg-publish":true,"permalink":"/facebook-did-not-accidentally-fail/","created":"[2018-04-11](2018-04-11)"}\n---\nBody.\n';
  const result = readMarkdownFrontmatter(text);
  assert.deepEqual(result.frontmatter, {
    "dg-publish": true,
    permalink: "/facebook-did-not-accidentally-fail/",
    created: "[2018-04-11](2018-04-11)",
  });
  assert.equal(result.body, "Body.\n");
  assert.equal(result.format, "yaml");
});

test("does not mask a genuine YAML error with JSON recovery when the fence is not a whole JSON object", () => {
  const text = '---\ntitle: "alfredo bonanno"\n{"dg-publish":true,"permalink":"/alfredo-bonanno/"}\n---\nBody.\n';
  assert.throws(() => readMarkdownFrontmatter(text), /invalid document/u);
});

test("reads block indentation, flow mappings, quoted keys, and standard escapes", () => {
  const text = [
    "---",
    "name: Example",
    "configuration: {enabled: true, count: 2}",
    "'legal key': 'single''s value'",
    'escaped: "line\\nvalue"',
    "items:",
    "  - one",
    "  - two",
    "---",
    "Body.",
    "",
  ].join("\n");
  const result = readMarkdownFrontmatter(text);
  assert.deepEqual(result.frontmatter, {
    name: "Example",
    configuration: { enabled: true, count: 2 },
    "legal key": "single's value",
    escaped: "line\nvalue",
    items: ["one", "two"],
  });
  assert.equal(result.body, "Body.\n");
});

test("refuses duplicate keys and scalar YAML frontmatter", () => {
  assert.throws(() => readMarkdownFrontmatter("---\nname: one\nname: two\n---\n"), /keys must be unique/u);
  assert.throws(() => readMarkdownFrontmatter("---\nscalar\n---\n"), /must be a mapping/u);
});

test("adapts absent frontmatter to null, empty metadata, or a refusal", () => {
  assert.deepEqual(readMarkdownFrontmatter("Body.\n"), { format: null, frontmatter: null, body: "Body.\n" });
  assert.deepEqual(readMarkdownFrontmatter("Body.\n", { absentFrontmatter: "empty" }), { format: null, frontmatter: {}, body: "Body.\n" });
  assert.throws(() => readMarkdownFrontmatter("Body.\n", { absentFrontmatter: "throw" }), /frontmatter is required/u);
});

test("projects the legacy flat string metadata contract without copying a YAML parser", () => {
  const result = readMarkdownFrontmatter("---\ntitle: Example\ntags: [one, two]\nnested: {skip: true}\nenabled: true\nempty:\n---\nBody\n", {
    yamlProjection: "flat-string-lists",
  });
  assert.deepEqual(result.frontmatter, { title: "Example", tags: ["one", "two"], empty: "" });
});

test("optionally returns top-level YAML source locations", () => {
  const result = readMarkdownFrontmatter("---\ntitle: Example\ntags:\n  - one\n---\nBody\n", { yamlSourceLocations: true });
  assert.deepEqual(result.keyLocations, {
    title: { line: 1, column: 1, offset: 0 },
    tags: { line: 2, column: 1, offset: 15 },
  });
});
