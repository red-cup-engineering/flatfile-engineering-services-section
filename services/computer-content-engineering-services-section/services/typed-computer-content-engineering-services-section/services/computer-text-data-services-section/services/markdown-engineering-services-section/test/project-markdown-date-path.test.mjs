import assert from "node:assert/strict";
import test from "node:test";
import { projectMarkdownDatePath } from "../src/project-markdown-date-path.mjs";

test("projects paths at exactly the supplied precision", () => {
  assert.equal(projectMarkdownDatePath({ date: "2002", slug: "blue", extension: "md" }).path, "2002/2002-blue.md");
  assert.equal(projectMarkdownDatePath({ date: "2023-09", slug: "unsettling-times", extension: "org" }).path, "2023/09/2023-09-unsettling-times.org");
  assert.equal(projectMarkdownDatePath({ date: "2023-09-12", slug: "unsettling-times", extension: "org" }).path, "2023/09/12/2023-09-12-unsettling-times.org");
  assert.equal(projectMarkdownDatePath({ date: null, slug: "blue", extension: "md" }).path, "undated/blue.md");
});

test("includes time only when explicitly supplied with day evidence", () => {
  assert.equal(projectMarkdownDatePath({ date: "2023-09-12", time: "00:00", slug: "midnight", extension: "md" }).path, "2023/09/12/2023-09-12-0000h-midnight.md");
  assert.throws(() => projectMarkdownDatePath({ date: "2002", time: "00:00", slug: "blue", extension: "md" }), /day-precision/u);
});

test("rejects invented, incomplete, and impossible components", () => {
  for (const date of ["0000", "2002-00", "2002-01-00", "2002-02-29"]) assert.throws(() => projectMarkdownDatePath({ date, slug: "blue", extension: "md" }), /date/u);
});
