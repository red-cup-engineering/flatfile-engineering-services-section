import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFullTextIndex } from "../src/vault/full-text-index.mjs";

test("a query ranks the documents holding every one of its words, folded, diacritics kept", () => {
  const index = openFullTextIndex();
  index.revise(({ put }) => {
    put("large.md", "r1", "irrelevant ".repeat(10_000) + "Pheží allocation allocation");
    put("direct.md", "r1", "PHEŽÍ allocation");
    put("missing.md", "r1", "allocation without the other requested term");
    put("plain.md", "r1", "Phezi allocation");
  });
  assert.deepEqual(index.search("Pheží allocation").map((hit) => hit.path), ["direct.md", "large.md"]);
  assert.deepEqual(index.search("   "), []);
  assert.equal(index.size, 4);
});

test("a kept index reopens at the revisions it held, and a revision replaces a document's text", () => {
  const dir = mkdtempSync(join(tmpdir(), "full-text-index-"));
  try {
    const file = join(dir, "full-text.sqlite");
    const first = openFullTextIndex({ file });
    first.revise(({ put }) => { put("a.md", "r1", "cedar fog"); put("b.md", "r1", "cedar"); });
    first.close();
    const again = openFullTextIndex({ file });
    assert.equal(again.revisionOf("a.md"), "r1");
    again.revise(({ put, remove }) => { put("a.md", "r2", "salt"); remove("b.md"); });
    assert.deepEqual(again.search("cedar"), []);
    assert.deepEqual(again.search("salt").map((hit) => hit.path), ["a.md"]);
    assert.deepEqual(again.paths(), ["a.md"]);
    again.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
