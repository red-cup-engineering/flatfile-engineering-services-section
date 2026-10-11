import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { compareStrings } from "../src/compare-strings.mjs";

test("reports a typed immutable comparison with original UTF-16 spans", () => {
  const result = compareStrings({ subject: "a😀a😀", query: "😀", caseSensitive: true });
  assert.deepEqual(result, {
    type: "StringComparison",
    relation: "contains",
    spans: [
      { matchedText: "😀", start: 1, end: 3 },
      { matchedText: "😀", start: 4, end: 6 },
    ],
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.spans), true);
  assert.equal(Object.isFrozen(result.spans[0]), true);
});

test("applies declared fold and boundary policies without domain vocabulary", () => {
  assert.deepEqual(compareStrings({
    subject: "witness-journal witnessJournal witness_journal",
    query: "WitnessJournal",
    fold: "camel-separator-insensitive",
  }).spans, [
    { matchedText: "witness-journal", start: 0, end: 15 },
    { matchedText: "witnessJournal", start: 16, end: 30 },
    { matchedText: "witness_journal", start: 31, end: 46 },
  ]);
  assert.equal(compareStrings({ subject: "sitemap map", query: "map", boundary: "non-alphanumeric" }).relation, "contains");
  assert.equal(compareStrings({ subject: "map", query: "MAP" }).relation, "equal");
  assert.equal(compareStrings({ subject: "map", query: "MAP", caseSensitive: true }).relation, "absent");
});

test("validates the public relation contract", () => {
  assert.throws(() => compareStrings({ subject: "a", query: "" }), /nonempty/u);
  assert.throws(() => compareStrings({ subject: "a", query: "a", caseSensitive: "yes" }), /boolean/u);
  assert.throws(() => compareStrings({ subject: "a", query: "a", fold: "loose" }), /fold/u);
  assert.throws(() => compareStrings({ subject: "a", query: "a", boundary: "word" }), /boundary/u);
});

test("the executable consumes one JSON request and emits one JSON comparison", () => {
  const script = new URL("../scripts/compare-strings.mjs", import.meta.url);
  const child = spawnSync(process.execPath, [script.pathname], {
    input: JSON.stringify({ subject: "alpha alpha", query: "alpha" }),
    encoding: "utf8",
  });
  assert.equal(child.status, 0);
  assert.equal(child.stderr, "");
  assert.deepEqual(JSON.parse(child.stdout), {
    type: "StringComparison",
    relation: "contains",
    spans: [
      { matchedText: "alpha", start: 0, end: 5 },
      { matchedText: "alpha", start: 6, end: 11 },
    ],
  });
});
