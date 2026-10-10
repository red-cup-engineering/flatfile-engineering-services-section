import assert from "node:assert/strict";
import test from "node:test";

import { migrateFrontmatterVocabulary } from "../scripts/migrate-frontmatter-vocabulary.mjs";
import { stripMarkdownFrontmatterKeys } from "../scripts/strip-markdown-frontmatter-key.mjs";

test("strips a nested top-level key without touching the body", () => {
  const source = "---\ntitle: Example\nprovenance:\n  method: generated\n  seed: 42\nsubject: kept\n---\nprovenance: body text\n";
  assert.equal(stripMarkdownFrontmatterKeys(source, ["provenance"]).text, "---\ntitle: Example\nsubject: kept\n---\nprovenance: body text\n");
});

test("performs the vocabulary migration and splits topical from system tags", () => {
  const source = "---\ntitle: Synthetic Corporation\ntype: research-note\ntags: [561 Group, synthetic corporation, Rendanheyi]\nstatus: draft-for-iteration\nprovenance: Claude session\n---\nBody.\n";
  const result = migrateFrontmatterVocabulary(source);
  assert.equal(result.text, "---\ntitle: Synthetic Corporation\ntype: note\nkeywords: [ 561 Group, synthetic corporation, Rendanheyi ]\ntags: [ draft ]\nauthors:\n  - Claude Opus\n---\nBody.\n");
  assert.deepEqual(migrateFrontmatterVocabulary(result.text), { text: result.text, changes: [] });
});

test("preserves existing authors and keywords while removing scalar provenance", () => {
  const source = "---\nauthors:\n  - emsenn\nkeywords: [existing]\ntags:\n  - topic\n  - draft\nprovenance: old\n---\nBody.\n";
  const result = migrateFrontmatterVocabulary(source);
  assert.equal(result.text, "---\nauthors:\n  - emsenn\n  - Claude Opus\nkeywords: [ existing, topic ]\ntags:\n  - draft\n---\nBody.\n");
});

test("refuses ambiguous duplicate scalar keys before migration", () => {
  const source = "---\ntype: parity transformation\ntype: research-note\n---\nBody.\n";
  assert.throws(() => migrateFrontmatterVocabulary(source), /keys must be unique/u);
});

test("quoted strings and opaque metadata survive vocabulary edits", () => {
  const source = '\uFEFF--- \r\n# source comment\r\ntitle: "false" # exact\r\ntype: \'research-note\' # genre\r\ntags: {nested: true}\r\nstatus: draft-for-iteration\r\n--- \r\nBody  \r\n';
  const result = migrateFrontmatterVocabulary(source);
  assert.equal(result.text, source.replace("'research-note'", "'note'"));
  assert.deepEqual(result.changes, ['changed type research-note to note']);
});
