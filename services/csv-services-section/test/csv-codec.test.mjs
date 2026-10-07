import assert from "node:assert/strict";
import test from "node:test";
import { decodeCsv, decodeCsvRows, encodeCsv } from "../scripts/csv-codec.mjs";

test("reads quoted fields holding commas, doubled quotes and line breaks", () => {
  const text = '﻿Tract,Comments,ACRES\r\n1,"A +/- 152\' x 359\' parcel, ""RR-1"".\nRecording fee $46.00.\n",1.26\r\n';
  assert.deepEqual(decodeCsvRows(text), [["Tract", "Comments", "ACRES"], ["1", 'A +/- 152\' x 359\' parcel, "RR-1".\nRecording fee $46.00.\n', "1.26"]]);
});

test("keys records by the header and round-trips what it writes", () => {
  const records = [{ parcel: "010-0070-00180", owner: 'SMITH "JR"', note: "a, b\nc" }, { parcel: "010-2", owner: "", note: "" }];
  assert.deepEqual(decodeCsv(encodeCsv(records)), records);
});

test("drops blank lines, pads short rows, refuses an unterminated quote", () => {
  assert.deepEqual(decodeCsv("a,b\n\n1\n"), [{ a: "1", b: "" }]);
  assert.throws(() => decodeCsvRows('a\n"open'), SyntaxError);
  assert.equal(encodeCsv([]), "");
});
