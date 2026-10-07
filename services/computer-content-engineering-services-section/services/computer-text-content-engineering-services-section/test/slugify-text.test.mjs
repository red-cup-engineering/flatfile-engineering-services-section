import assert from "node:assert/strict";
import test from "node:test";

import { slugify } from "../src/slugify-text.mjs";

test("lowercases and hyphenates ordinary titles", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
  assert.equal(slugify("The Quick Brown Fox"), "the-quick-brown-fox");
});

test("collapses runs of non-alphanumeric characters to one hyphen", () => {
  assert.equal(slugify("a   b--c___d"), "a-b-c-d");
  assert.equal(slugify("multiple///slashes"), "multiple-slashes");
});

test("trims leading and trailing hyphens", () => {
  assert.equal(slugify("--leading and trailing--"), "leading-and-trailing");
  assert.equal(slugify("!!!wrapped!!!"), "wrapped");
});

test("NFKD-strips diacritics down to their base letters", () => {
  assert.equal(slugify("Café"), "cafe");
  assert.equal(slugify("naïve résumé"), "naive-resume");
  assert.equal(slugify("Über"), "uber");
});

test("preserves digits and mixes them with letters", () => {
  assert.equal(slugify("Chapter 12: The Beginning"), "chapter-12-the-beginning");
  assert.equal(slugify("2026 Report"), "2026-report");
});

test("an already-slug input is unchanged", () => {
  assert.equal(slugify("already-a-slug"), "already-a-slug");
  assert.equal(slugify("term123"), "term123");
});

test("input with no admissible characters slugifies to an empty string", () => {
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify("   "), "");
  assert.equal(slugify(""), "");
});

test("is idempotent: slugifying a slug returns the same slug", () => {
  const once = slugify("Café Society: A Résumé, 2026!");
  assert.equal(slugify(once), once);
});

test("refuses a non-string input", () => {
  assert.throws(() => slugify(undefined), TypeError);
  assert.throws(() => slugify(42), TypeError);
  assert.throws(() => slugify(null), TypeError);
});
