import assert from "node:assert/strict";
import test from "node:test";
import { makeFlatfile } from "../src/substrate/flatfile.mjs";
import { check } from "../src/closure/rules/proofs.mjs";
import { composeRules } from "../src/closure/rules/compose-rules.mjs";

function theorem({status = "proved", body = "## Proof\\n\\nBy the alleged lemma. $\\\\square$", extra = {}} = {}) {
  return makeFlatfile({
    slug: "a-theorem",
    kind: "theorem",
    dir: "theorems",
    fm: {title: "A theorem", status, ...extra},
    body,
    path: "theorems/a-theorem.md",
    mtime: 0,
  });
}

test("a Markdown Proof heading and square do not constitute machine-checked proof", () => {
  const note = theorem({body: "## Proof\n\nA locally asserted argument. $\\square$"});
  const diagnostics = check([note]);
  assert.deepEqual(diagnostics.map(x => x.rule), ["unverified-proof"]);
  assert.equal(diagnostics[0].path, note.path);
  assert.match(diagnostics[0].message, /authored claim/u);
});

test("a forged Lean reference and status cannot supply absent proof receiving", () => {
  const note = theorem({
    body: "## Proof\n\nThe author declares this proved. $\\square$",
    extra: {lean: "Unseen.Theorem", "proof-receipt": "passed"},
  });
  assert.ok(check([note]).some(x => x.rule === "unverified-proof"));
  assert.ok(composeRules([note]).some(x => x.rule === "unverified-proof"));
});

test("missing proof structure is reported separately from missing independent verification", () => {
  const diagnostics = check([theorem({body: "No proof text."})]);
  assert.deepEqual(diagnostics.map(x => x.rule), ["missing-proof", "unverified-proof"]);
});

test("a work-in-progress theorem and a missing status are never silently proved", () => {
  assert.deepEqual(check([theorem({status: "sketch"})]).map(x => x.rule), ["wip-theorem"]);
  assert.deepEqual(check([theorem({status: undefined})]).map(x => x.rule), ["missing-status"]);
});
