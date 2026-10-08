import assert from "node:assert/strict";
import test from "node:test";
import { measureMarkdownDatePath } from "../src/measure-markdown-date-path.mjs";

test("measures day, month, year, and undated precision", () => {
  assert.deepEqual(measureMarkdownDatePath("2023/09/12/2023-09-12-unsettling-times.org").observation, { precision: "day", date: "2023-09-12", time: null, slug: "unsettling-times", extension: "org" });
  assert.deepEqual(measureMarkdownDatePath("2023/09/2023-09-unsettling-times.md").observation, { precision: "month", date: "2023-09", time: null, slug: "unsettling-times", extension: "md" });
  assert.deepEqual(measureMarkdownDatePath("2002/2002-blue.md").observation, { precision: "year", date: "2002", time: null, slug: "blue", extension: "md" });
  assert.deepEqual(measureMarkdownDatePath("undated/blue.md").observation, { precision: "undated", date: null, time: null, slug: "blue", extension: "md" });
});

test("measures a time only when the filename actually contains one", () => {
  assert.equal(measureMarkdownDatePath("2023/09/12/2023-09-12-unsettling-times.org").observation.time, null);
  assert.equal(measureMarkdownDatePath("2023/09/12/2023-09-12-0000h-unsettling-times.org").observation.time, "00:00");
});

test("rejects zero placeholders, false precision topology, and impossible dates", () => {
  for (const path of ["0000/00/00/0000-00-00-untitled-12.md", "2002/00/00/2002-00-00-blue.md", "2002/01/01/2002-blue.md", "2023/02/29/2023-02-29-example.md"]) {
    assert.equal(measureMarkdownDatePath(path).conformant, false, path);
  }
});

test("requires literal dots between compound extension components", () => {
  assert.equal(measureMarkdownDatePath("2023/09/12/2023-09-12-blue.tar.gz").conformant, true);
  assert.equal(measureMarkdownDatePath("2023/09/12/2023-09-12-blue.tar@gz").conformant, false);
});
