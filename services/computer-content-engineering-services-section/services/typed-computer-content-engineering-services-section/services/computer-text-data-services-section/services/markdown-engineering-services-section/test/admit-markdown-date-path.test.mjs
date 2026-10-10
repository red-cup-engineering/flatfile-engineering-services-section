import assert from "node:assert/strict";
import test from "node:test";
import { admitMarkdownDatePath } from "../src/admit-markdown-date-path.mjs";

test("admits only the canonical path at the precision of its evidence", () => {
  const yearEvidence = { date: "2002", time: null, relation: "source-named", source: "git-head-path", locator: "backup/2002/blue.md", lexeme: "2002" };
  assert.equal(admitMarkdownDatePath({ path: "2002/2002-blue.md", evidence: yearEvidence, slug: "blue", extension: "md" }).precision, "year");
  assert.throws(() => admitMarkdownDatePath({ path: "2002/01/01/2002-01-01-blue.md", evidence: yearEvidence, slug: "blue", extension: "md" }), /expected 2002\/2002-blue\.md/u);

  const dayEvidence = { ...yearEvidence, date: "2023-09-12", relation: "created", locator: "blue.org", lexeme: "2023-09-12" };
  assert.throws(() => admitMarkdownDatePath({ path: "2023/09/12/2023-09-12-0000h-blue.md", evidence: dayEvidence, slug: "blue", extension: "md" }), /expected/u);
});

test("rejects unattributed date values", () => {
  assert.throws(() => admitMarkdownDatePath({ path: "2002/2002-blue.md", evidence: { date: "2002" }, slug: "blue", extension: "md" }), /relation/u);
});

test("may omit an evidenced time but never invent one", () => {
  const midnight = { date: "2023-09-12", time: "00:00", relation: "created", source: "frontmatter", locator: "blue.md", lexeme: "2023-09-12T00:00" };
  assert.equal(admitMarkdownDatePath({ path: "2023/09/12/2023-09-12-blue.md", evidence: midnight, slug: "blue", extension: "md" }).filingTime, null);
  assert.throws(() => admitMarkdownDatePath({ path: "2023/09/12/2023-09-12-1234h-blue.md", evidence: midnight, filingTime: "12:34", slug: "blue", extension: "md" }), /exactly supported/u);
});
