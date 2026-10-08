import assert from "node:assert/strict";
import test from "node:test";
import { readMarkdownTable } from "../src/read-markdown-table.mjs";

test("reads headers and header-keyed rows from the first table", () => {
  const text = "# Title\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n";
  const table = readMarkdownTable({ text });
  assert.deepEqual(table.headers, ["A", "B"]);
  assert.deepEqual(table.rows, [{ A: "1", B: "2" }]);
  assert.equal(table.rowCount, 1);
  assert.deepEqual(table.position, { line: 3 });
});

test("scopes the search to a named heading's section", () => {
  const text = "# One\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n# Two\n\n| C | D |\n| - | - |\n| 3 | 4 |\n";
  const table = readMarkdownTable({ text, heading: "Two" });
  assert.deepEqual(table.headers, ["C", "D"]);
  assert.deepEqual(table.rows, [{ C: "3", D: "4" }]);
});

test("tableIndex selects the Nth table within the searched scope", () => {
  const text = "| A |\n| - |\n| 1 |\n\n| B |\n| - |\n| 2 |\n";
  const table = readMarkdownTable({ text, tableIndex: 1 });
  assert.deepEqual(table.headers, ["B"]);
  assert.deepEqual(table.rows, [{ B: "2" }]);
});

test("leading and trailing pipes are optional", () => {
  const text = "A | B\n--- | ---\n1 | 2\n";
  const table = readMarkdownTable({ text });
  assert.deepEqual(table.headers, ["A", "B"]);
  assert.deepEqual(table.rows, [{ A: "1", B: "2" }]);
});

test("a backslash-escaped pipe does not delimit a column and is kept as literal text", () => {
  const text = "| A | B |\n| --- | --- |\n| a\\|b | 2 |\n";
  const table = readMarkdownTable({ text });
  assert.equal(table.rows[0].A, "a\\|b");
  assert.equal(table.rows[0].B, "2");
});

test("inline emphasis markers are preserved as literal cell text", () => {
  const text = "| A |\n| --- |\n| **bold** text |\n";
  const table = readMarkdownTable({ text });
  assert.equal(table.rows[0].A, "**bold** text");
});

test("alignment colons in the delimiter row do not become data", () => {
  const text = "| A | B |\n| :--- | ---: |\n| 1 | 2 |\n";
  const table = readMarkdownTable({ text });
  assert.deepEqual(table.headers, ["A", "B"]);
  assert.deepEqual(table.rows, [{ A: "1", B: "2" }]);
});

test("refuses with NO_TABLE_FOUND when no GitHub-flavored table exists", () => {
  const text = "# Title\n\nJust prose, no table.\n";
  assert.deepEqual(readMarkdownTable({ text }), { refused: "NO_TABLE_FOUND", heading: null, tableIndex: 0 });
});

test("refuses with NO_TABLE_FOUND when the named heading does not exist", () => {
  const text = "# One\n\n| A |\n| - |\n| 1 |\n";
  assert.deepEqual(readMarkdownTable({ text, heading: "Missing" }), { refused: "NO_TABLE_FOUND", heading: "Missing", tableIndex: 0 });
});

test("refuses a missing text", () => assert.throws(() => readMarkdownTable({}), /text is required/u));

test("table discovery excludes metadata and fenced examples using source observations", () => {
  const text = ['---', 'example: |', '  A | B', '  - | -', '---', '~~~~md', 'A | B', '- | -', 'fake | row', '~~~~', '', 'Real | Table', '- | -', 'actual | row'].join("\n");
  assert.deepEqual(readMarkdownTable({ text }).rows, [{ Real: "actual", Table: "row" }]);
  assert.equal(readMarkdownTable({ text }).position.line, 12);
});
