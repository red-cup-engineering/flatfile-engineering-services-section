import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { recordResearchQuestion, researchQuestionPath } from "../scripts/record-research-question.mjs";

test("projects the conventional section-owned question address", () => {
  assert.equal(
    researchQuestionPath({ sectionPath: "services/dao-services-section", slug: "why-tea-cools" }),
    "services/dao-services-section/content/text/documents/articles/research-articles/questions/why-tea-cools.md",
  );
  assert.throws(() => researchQuestionPath({ sectionPath: "../outside", slug: "why-tea-cools" }), /confined relative path/u);
  assert.throws(() => researchQuestionPath({ sectionPath: "dao", slug: "Why Tea" }), /slug/u);
});

test("records a conforming question without overwriting an existing carrier", async () => {
  const root = await mkdtemp("/tmp/research-question-");
  const request = {
    root,
    sectionPath: "services/dao-services-section",
    slug: "why-tea-cools",
    title: "Why does the tea cool?",
    question: "Why does this tea cool unusually quickly?",
    dateCreated: "2026-08-28",
    status: "partially-addressed",
    frontmatter: { tags: ["tea"] },
    research: "## Initial finding\n\nThe observation needs a controlled comparison.",
  };
  try {
    const result = await recordResearchQuestion(request);
    assert.equal(result.validation.conformant, true);
    assert.equal(result.receipt.created, true);
    const text = await readFile(join(root, result.relativePath), "utf8");
    assert.match(text, /type: "question"/u);
    assert.match(text, /status: "partially-addressed"/u);
    assert.match(text, /## Question\n\nWhy does this tea cool unusually quickly\?/u);
    await assert.rejects(() => recordResearchQuestion(request), /already exists/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses reserved metadata overrides", async () => {
  await assert.rejects(
    () => recordResearchQuestion({
      root: "/tmp",
      sectionPath: "dao",
      slug: "why-tea-cools",
      title: "Why does the tea cool?",
      question: "Why?",
      dateCreated: "2026-08-28",
      frontmatter: { type: "note" },
    }),
    /reserved key type/u,
  );
});

test("refuses a section path that traverses a symbolic link outside the root", async () => {
  const root = await mkdtemp("/tmp/research-question-root-");
  const outside = await mkdtemp("/tmp/research-question-outside-");
  try {
    await symlink(outside, join(root, "linked-section"));
    await assert.rejects(
      () => recordResearchQuestion({
        root,
        sectionPath: "linked-section",
        slug: "why-tea-cools",
        title: "Why does the tea cool?",
        question: "Why?",
        dateCreated: "2026-08-28",
      }),
      /symbolic link/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
