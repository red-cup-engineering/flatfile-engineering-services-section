import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createTermIndex, foldedWords, TERM_INDEX_CATEGORY, TERM_INDEX_RECORD_BYTES, carriedBytes } from "@red-cup-engineering/semiotic-eavt-services-section/term-index";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

test("a query ranks the keys holding every one of its words by BM25, ties by key", () => {
  const index = createTermIndex();
  index.revise(({ put }) => {
    put("large", "r1", "irrelevant ".repeat(10_000) + "Pheží allocation allocation");
    put("direct", "r1", "PHEŽÍ allocation");
    put("missing", "r1", "allocation without the other requested term");
    put("plain", "r1", "Phezi allocation");
  });
  assert.deepEqual(index.search("Pheží allocation").map((hit) => hit.key), ["direct", "large"]);
  assert.deepEqual(index.search("allocation", { limit: 2 }).length, 2);
  assert.deepEqual(index.search("   "), []);
  assert.deepEqual(index.search("absent"), []);
  assert.equal(index.size, 4);
  // A rarer word outweighs a common one.
  const [first] = index.search("phezi");
  assert.equal(first.key, "plain");
  assert.ok(first.score > 0);
});

test("a folding tokenizer reads diacritics away", () => {
  const index = createTermIndex({ tokenize: foldedWords });
  index.revise(({ put }) => { put("a", "r1", "Pheží"); put("b", "r1", "phezi"); });
  assert.deepEqual(index.search("PHEZI").map((hit) => hit.key), ["a", "b"]);
});

test("a journaled index reopens at the revisions it held: puts are held, removals denied", (t) => {
  const root = mkdtempSync(join(tmpdir(), "term-index-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let clock = 0;
  const now = () => new Date(Date.UTC(2026, 9, 10, 0, 0, clock++)).toISOString();
  const first = createTermIndex({ root, objectKind: "test.term-index", now });
  first.revise(({ put }) => { put("a.md", "r1", "cedar fog"); put("b.md", "r1", "cedar"); });
  const again = createTermIndex({ root, objectKind: "test.term-index", now });
  assert.equal(again.revisionOf("a.md"), "r1");
  assert.deepEqual(again.search("cedar").map((hit) => hit.key), ["b.md", "a.md"]);
  again.revise(({ put, remove }) => { put("a.md", "r2", "salt"); remove("b.md"); remove("never.md"); });
  // A put of an earlier revision after a removal is a new entry, not a duplicate of the first.
  again.revise(({ put, remove }) => { put("b.md", "r1", "cedar"); remove("b.md"); put("b.md", "r1", "cedar"); });
  const third = createTermIndex({ root, objectKind: "test.term-index", now });
  assert.deepEqual(third.search("salt").map((hit) => hit.key), ["a.md"]);
  assert.deepEqual(third.search("fog"), []);
  assert.deepEqual(third.keys().sort(), ["a.md", "b.md"]);
  assert.equal(third.revisionOf("a.md"), "r2");

  const entries = createSemanticRecordJournal({ root, objectKind: "test.term-index" }).query({ category: TERM_INDEX_CATEGORY });
  // One record per revision and charge: what it put, held; what it removed, denied. A removal of
  // a key never held records nothing, and the last change to a key in one revision is the one kept.
  assert.deepEqual(entries.map((row) => [row.told.for, row.told.against, row.record.documents.split("\n").map((line) => JSON.parse(line)[0])]), [
    [true, false, ["a.md", "b.md"]],
    [true, false, ["a.md"]], [false, true, ["b.md"]],
    [true, false, ["b.md"]],
  ]);
  // Only word counts are kept, never the text.
  assert.deepEqual(JSON.parse(entries[0].record.documents.split("\n")[0]), ["a.md", "r1", 2, "cedar\t1\nfog\t1"]);
});

test("a change that throws records nothing", (t) => {
  const root = mkdtempSync(join(tmpdir(), "term-index-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const index = createTermIndex({ root });
  assert.throws(() => index.revise(({ put }) => { put("a", "r1", "cedar"); throw new Error("refused"); }), /refused/);
  assert.equal(index.size, 0);
  assert.equal(createTermIndex({ root }).size, 0);
});

test("a revision past the journal's string bound splits across records, and a large document continues across lines", (t) => {
  const root = mkdtempSync(join(tmpdir(), "term-index-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const vast = Array.from({ length: 40_000 }, (_, index) => `word${index}`).join(" ");
  const index = createTermIndex({ root });
  index.revise(({ put }) => {
    put("vast", "r1", vast);
    for (let document = 0; document < 300; document += 1) put(`small-${document}`, "r1", `${"cedar ".repeat(document % 7 + 1)} fog${document} ${Array.from({ length: 120 }, (_, word) => `w${(document * 31 + word) % 997}`).join(" ")}`);
  });
  const entries = createSemanticRecordJournal({ root, objectKind: "term-index" }).query({ category: TERM_INDEX_CATEGORY });
  assert.ok(entries.length > 2);
  for (const row of entries) assert.ok(carriedBytes(row.record.documents) <= TERM_INDEX_RECORD_BYTES);
  const again = createTermIndex({ root });
  assert.equal(again.size, 301);
  assert.deepEqual(again.search("word0 word39999").map((hit) => hit.key), ["vast"]);
  assert.deepEqual(again.search("fog123").map((hit) => hit.key), ["small-123"]);
  assert.deepEqual(again.search("cedar", { limit: 300 }).map((hit) => hit.key), index.search("cedar", { limit: 300 }).map((hit) => hit.key));
});

test("match answers the FTS5 query subset: words, prefixes, phrases, AND, OR, NOT, parentheses", () => {
  const texts = new Map([
    ["a", "cedar fog over the harbor"],
    ["b", "fog cedar harbor lights"],
    ["c", "salt marsh and cedar"],
    ["d", "x402 payments over ActivityPub"],
  ]);
  const index = createTermIndex();
  index.revise(({ put }) => { for (const [key, text] of texts) put(key, "r1", text); });
  const keys = (expression, options) => index.match(expression, { textOf: (key) => texts.get(key), ...options }).map((hit) => hit.key).sort();
  assert.deepEqual(keys("cedar fog"), ["a", "b"], "juxtaposed words all match");
  assert.deepEqual(keys("cedar AND fog"), ["a", "b"]);
  assert.deepEqual(keys('"cedar fog"'), ["a"], "a phrase is matched word for word against the text");
  assert.deepEqual(index.match('"cedar fog"').map((hit) => hit.key).sort(), ["a", "b"], "without the text a phrase asks only for its words");
  assert.deepEqual(keys("marsh OR lights"), ["b", "c"]);
  assert.deepEqual(keys("cedar NOT fog"), ["c"]);
  assert.deepEqual(keys("cedar NOT (fog OR salt)"), []);
  assert.deepEqual(keys("(salt OR harbor) AND cedar NOT lights"), ["a", "c"], "NOT binds tighter than AND, AND tighter than OR");
  assert.deepEqual(keys("har*"), ["a", "b"]);
  assert.deepEqual(keys("activity*"), ["d"]);
  assert.deepEqual(keys('"x402 payments"'), ["d"]);
  assert.deepEqual(keys("absent OR x402"), ["d"]);
  assert.deepEqual(keys("   "), []);
  // A word a query asks for twice scores like FTS5's: the rarer word outweighs the common one.
  const [best] = index.match("cedar OR marsh");
  assert.equal(best.key, "c");
  for (const unsupported of ["title:cedar", "NEAR(cedar fog)", "^cedar", "+cedar"]) assert.throws(() => index.match(unsupported), /unsupported FTS5/u, unsupported);
  assert.throws(() => index.match("(cedar"), /parenthesis/u);
  assert.throws(() => index.match("cedar)"), /parenthesis/u);
});
