import assert from "node:assert/strict";
import test from "node:test";
import { projectMarkdownAssertions } from "../src/project-markdown-assertions.mjs";

test("projects scalar, repeated, and canonical structured Markdown assertions", () => {
  const read = projectMarkdownAssertions({ coordinate: "note.md", frontmatter: { slug: "note", tags: ["one", "two"], metadata: { z: 1, a: true } }, body: "Body" });
  assert.equal(read.subject, "note");
  assert.deepEqual(read.assertions, [
    { e: "note", a: "slug", v: "note", t: "note.md" },
    { e: "note", a: "tags", v: "one", t: "note.md" },
    { e: "note", a: "tags", v: "two", t: "note.md" },
    { e: "note", a: "metadata", v: '{"a":true,"z":1}', t: "note.md" },
    { e: "note", a: "body", v: "Body", t: "note.md" },
  ]);
});
