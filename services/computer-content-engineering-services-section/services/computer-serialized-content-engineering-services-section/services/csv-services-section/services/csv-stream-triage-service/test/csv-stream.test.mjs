import assert from "node:assert/strict";
import { test } from "node:test";
import { csvRecords, csvRows } from "../src/csv-stream.mjs";

const collect = async (chunks) => { const rows = []; for await (const row of csvRows(chunks)) rows.push(row); return rows; };
const bytes = (text) => new TextEncoder().encode(text);
const text = 'a,b,c\r\n1,"x, ""y""",3\r\n"line\nbreak",,\n\n4,5,6';
const expected = [["a", "b", "c"], ["1", 'x, "y"', "3"], ["line\nbreak", "", ""], ["4", "5", "6"]];

test("quoted commas, doubled quotes, embedded newlines, CRLF and a missing final newline", async () => {
  assert.deepEqual(await collect([text]), expected);
});

test("the answer does not depend on where chunks are cut, even inside a quote pair or a UTF-8 character", async () => {
  const all = bytes(`﻿${text}é`);
  for (let size = 1; size <= 9; size += 1) {
    const chunks = [];
    for (let at = 0; at < all.length; at += size) chunks.push(all.slice(at, at + size));
    const rows = await collect(chunks);
    assert.deepEqual(rows.slice(0, 3), expected.slice(0, 3), `chunk size ${size}`);
    assert.deepEqual(rows[3], ["4", "5", "6é"], `chunk size ${size}`);
  }
});

test("a file ending inside a quote is refused, not silently truncated", async () => {
  await assert.rejects(collect(['a,b\n1,"open']), /inside a quoted field/u);
});

test("records are keyed by the header; ragged rows are reported and skipped", async () => {
  const ragged = [];
  const records = [];
  for await (const record of csvRecords(["id,name\n1,one\n2\n3,three\n"], { onMalformed: (number, width) => ragged.push([number, width]) })) records.push(record);
  assert.deepEqual(records, [{ id: "1", name: "one" }, { id: "3", name: "three" }]);
  assert.deepEqual(ragged, [[3, 1]]);
  await assert.rejects(csvRecords(["a,a\n1,2\n"]).next(), /duplicate column/u);
});

test("a large file streams through in bounded chunks without being held whole", async () => {
  const line = `"id","Title, with comma","${"long description ".repeat(40)}"\n`;
  async function* source() {
    yield "a,b,c\n";
    let buffer = "";
    for (let i = 0; i < 200_000; i += 1) { buffer += line; if (buffer.length > 65_536) { yield new TextEncoder().encode(buffer); buffer = ""; } }
    yield buffer;
  }
  let count = 0;
  for await (const record of csvRecords(source())) { count += 1; assert.equal(record.b, "Title, with comma"); }
  assert.equal(count, 200_000);
});
