import assert from "node:assert/strict";
import test from "node:test";

import { createMarkdownDocument } from "../src/create-markdown-document.mjs";

test("creates canonical frontmatter and a Markdown body from one view", () => {
  const document = createMarkdownDocument({
    title: "FOAM",
    authors: ["Codex@example"],
    "date-created": "2026-08-12",
    body: "A first line.\nA second line.\n"
  }, { semanticLinefeeds: false });

  assert.equal(document, [
    "---",
    "authors:",
    "  - Codex@example",
    "date-created: 2026-08-12",
    "title: FOAM",
    "---",
    "A first line.",
    "A second line.",
    ""
  ].join("\n"));
});

test("omits nullish metadata but preserves an explicit empty array", () => {
  const document = createMarkdownDocument({ title: "SEA", aliases: [], absent: null, body: "Definition.\n" });
  assert.match(document, /^---\naliases: \[\]\ntitle: SEA\n---\n/);
  assert.doesNotMatch(document, /absent/);
});

import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { markdownProjector } from "../src/markdown-projector.mjs";

for (const value of ["authored", { retained: "authored" }]) test(`retains an own __proto__ ${typeof value} field without changing prototypes`, () => {
  const view = JSON.parse('{"__proto__":null,"title":"Source-backed content","body":"Evidence remains.\\n"}');
  view.__proto__ = value;
  const before = Object.getPrototypeOf(view);
  const rendered = createMarkdownDocument(view);
  const read = readMarkdownFrontmatter(rendered).frontmatter;
  assert.equal(Object.hasOwn(read, "__proto__"), true);
  assert.deepEqual(read.__proto__, value);
  assert.equal(Object.getPrototypeOf(view), before);
  assert.equal(Object.getPrototypeOf(read), Object.prototype);
  assert.equal(Object.prototype.retained, undefined);
});

test("explicit null preservation retains authored keys while undefined remains omitted", () => {
  const view = JSON.parse('{"__proto__":null,"title":"Authored absence","optional":null,"nested":{"optional":null},"body":"Evidence.\\n"}');
  view.undefinedField = undefined;
  const read = readMarkdownFrontmatter(createMarkdownDocument(view, { nullFrontmatter: "preserve" })).frontmatter;
  assert.equal(Object.hasOwn(read, "__proto__"), true);
  assert.equal(read.__proto__, null);
  assert.equal(Object.hasOwn(read, "optional"), true);
  assert.equal(read.optional, null);
  assert.deepEqual(read.nested, { optional: null });
  assert.equal(Object.hasOwn(read, "undefinedField"), false);
});

test("explicit omission retains the existing default contract", () => {
  const view = { title: "Default semantics", optional: null, undefinedField: undefined, aliases: [], body: "Evidence.\n" };
  assert.equal(createMarkdownDocument(view, { nullFrontmatter: "omit" }), createMarkdownDocument(view));
  const read = readMarkdownFrontmatter(createMarkdownDocument(view)).frontmatter;
  assert.equal(Object.hasOwn(read, "optional"), false);
  assert.equal(Object.hasOwn(read, "undefinedField"), false);
  assert.deepEqual(read.aliases, []);
});

test("unknown null policies refuse instead of silently changing metadata semantics", () => {
  for (const nullFrontmatter of [null, true, false, "retain", 0]) assert.throws(() => createMarkdownDocument({ title: "Policy", body: "Evidence." }, { nullFrontmatter }), /nullFrontmatter must be omit or preserve/);
});

test("real generic Markdown projection retains own-key metadata and existing null omission", () => {
  const view = JSON.parse('{"__proto__":{"retained":"authored"},"title":"A sourced document","author":"Original author","optional":null,"body":"A first finding. A second finding.\\n"}');
  const rendered = markdownProjector.write([view]);
  const read = readMarkdownFrontmatter(rendered);
  assert.equal(Object.hasOwn(read.frontmatter, "__proto__"), true);
  assert.deepEqual(read.frontmatter.__proto__, view.__proto__);
  assert.equal(read.frontmatter.author, "Original author");
  assert.equal(Object.hasOwn(read.frontmatter, "optional"), false);
  assert.equal(read.body, "A first finding.\nA second finding.\n");
  assert.equal(markdownProjector.write([{ ...read.frontmatter, body: read.body }]), rendered);
});

test("body-key selection and semantic-linefeed control remain independent of null policy", () => {
  const view = { title: "Body carrier", body: "An authored metadata field", content: "One sentence. Another sentence.\n", optional: null };
  const rendered = createMarkdownDocument(view, { bodyKey: "content", nullFrontmatter: "preserve", semanticLinefeeds: false });
  const read = readMarkdownFrontmatter(rendered);
  assert.equal(read.frontmatter.body, view.body);
  assert.equal(Object.hasOwn(read.frontmatter, "content"), false);
  assert.equal(read.frontmatter.optional, null);
  assert.equal(read.body, view.content);
});
