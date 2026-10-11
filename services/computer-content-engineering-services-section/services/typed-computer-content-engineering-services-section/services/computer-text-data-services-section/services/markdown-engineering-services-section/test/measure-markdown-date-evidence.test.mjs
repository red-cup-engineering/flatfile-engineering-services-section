import assert from "node:assert/strict";
import test from "node:test";
import { measureMarkdownDateEvidence } from "../src/measure-markdown-date-evidence.mjs";

test("recovers compact provenance dates from ancestor directory names", () => {
  const result = measureMarkdownDateEvidence({ locator: "backups/20170304-emsenn-backup/notes/blue.md", source: "git-head-path" });
  assert.deepEqual(result.evidence, [{ precision: "day", date: "2017-03-04", time: null, lexeme: "20170304", offset: 8, source: "git-head-path" }]);
});

test("measures every candidate instead of silently choosing between archive and document dates", () => {
  const result = measureMarkdownDateEvidence({ locator: "legacy/2026-06-17-archive/x/20170304-backup/blue.md" });
  assert.deepEqual(result.evidence.map(({ date }) => date), ["2026-06-17", "2017-03-04"]);
});

test("preserves reduced precision and only measures explicit times", () => {
  assert.deepEqual(measureMarkdownDateEvidence({ locator: "notes/2002/blue.md" }).evidence.map(({ date, precision }) => ({ date, precision })), [{ date: "2002", precision: "year" }]);
  assert.equal(measureMarkdownDateEvidence({ locator: "2023-09-12-0000h-midnight.md" }).evidence[0].time, "00:00");
  assert.equal(measureMarkdownDateEvidence({ locator: "2023-09-12-midnight.md" }).evidence[0].time, null);
});

test("rejects impossible dates without degrading them to false lower precision", () => {
  const result = measureMarkdownDateEvidence({ locator: "notes/2023-02-29-example.md" });
  assert.equal(result.evidence.length, 0);
  assert.equal(result.rejected[0].reason, "not-a-calendar-date");
});

test("measures explicit English calendar dates at their stated precision", () => {
  assert.deepEqual(measureMarkdownDateEvidence({ locator: "Settlerday, October 24 2020.md" }).evidence.map(({ date, precision }) => ({ date, precision })), [{ date: "2020-10-24", precision: "day" }]);
  assert.deepEqual(measureMarkdownDateEvidence({ locator: "Brief Update, September 2023.md" }).evidence.map(({ date, precision }) => ({ date, precision })), [{ date: "2023-09", precision: "month" }]);
  assert.equal(measureMarkdownDateEvidence({ locator: "Thursday, July 10th 2025, 8:51:13 pm" }).evidence[0].time, "20:51");
  assert.equal(measureMarkdownDateEvidence({ locator: "CLN Winter Drive 2023, Jan 8th Update.md" }).evidence[0].date, "2023-01-08");
});
