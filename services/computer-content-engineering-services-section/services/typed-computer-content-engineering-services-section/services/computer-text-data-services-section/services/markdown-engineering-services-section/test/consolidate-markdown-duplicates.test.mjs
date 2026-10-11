import assert from "node:assert/strict";
import test from "node:test";
import { copyStem, planMarkdownNamesakeMerge } from "../src/consolidate-markdown-duplicates.mjs";

const prose = (extra = "") => [
  "---", "name: canon", "---", "",
  "Canon is the set of facts, events, and relationships accepted as authoritative within a fictional world, the part of its material that later works must respect.",
  "",
  "The concept matters wherever a fictional world extends beyond a single work, since a series, a franchise, or a shared world must each settle what counts as established fact.",
  "",
  "Editors keep canon by deciding which tellings bind the ones that follow, and readers test it by holding a new work against every earlier one they remember from the same world.",
  "",
  "A world may be internally consistent and still not canonical, as an alternate timeline is, and canonical material may still contain errors of continuity that later works repair.",
  extra,
].join("\n");

test("copyStem sets aside an import's dates, source marks and counters", () => {
  assert.equal(copyStem("a/canon.md"), "canon");
  assert.equal(copyStem("a/canon-2026-03-05.md"), "canon");
  assert.equal(copyStem("a/2026-03-05-canon-from-library.md"), "canon");
  assert.equal(copyStem("a/2026-03-05-lore-1.md"), "lore");
  assert.equal(copyStem("a/2026-03-05-relational-worlding-2026-03-05.md"), "relational-worlding");
  assert.equal(copyStem("a/note-on-canon.md"), "canon");
  assert.equal(copyStem("a/2026-03-05-1957h.md"), "2026-03-05-1957h");
  assert.equal(copyStem("a/1984.md"), "1984");
});

test("dated and counted copies of a term merge into the glossary home", () => {
  const home = "science/glossary/terms/canon.md";
  const dated = "science/glossary/terms/canon-2026-03-05.md";
  const note = "science/notes/2026/03/05/2026-03-05-canon-from-library.md";
  const plan = planMarkdownNamesakeMerge({ documents: [
    { path: home, text: prose("\nCanon works in tension with continuity, which is the internal consistency of a world across its realizations.") },
    { path: dated, text: prose() },
    { path: note, text: prose("\nA short paragraph only the note holds.") },
  ] });
  assert.equal(plan.retarget.get(dated), home);
  assert.equal(plan.retarget.get(note), home);
});

test("a cleanly named copy is the home even when a dated copy says a little more", () => {
  const clean = "science/section/glossary/terms/worldbuilding.md";
  const dated = "science/glossary/terms/worldbuilding-2026-03-05.md";
  const plan = planMarkdownNamesakeMerge({ documents: [
    { path: clean, text: prose() },
    { path: dated, text: prose("\nA short paragraph only the dated copy holds.") },
  ] });
  assert.equal(plan.retarget.get(dated), clean);
});
