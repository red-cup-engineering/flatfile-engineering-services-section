import assert from "node:assert/strict";
import test from "node:test";
import { cronRuleOf, isScheduledAt, latestScheduledAtOrBefore, nextScheduledAfter } from "../src/schedule.mjs";

const iso = (ms) => (ms === undefined ? undefined : new Date(ms).toISOString());

test("a weekday morning in Chicago keeps its wall hour across daylight saving", () => {
  const rule = cronRuleOf("30 9 * * 1-5");
  // Friday 2026-10-30 is CDT (UTC-5); Monday 2026-11-02 is CST (UTC-6).
  assert.equal(iso(nextScheduledAfter(rule, "America/Chicago", "2026-10-30T12:00:00Z")), "2026-10-30T14:30:00.000Z");
  assert.equal(iso(nextScheduledAfter(rule, "America/Chicago", "2026-10-30T15:00:00Z")), "2026-11-02T15:30:00.000Z");
  assert.equal(iso(latestScheduledAtOrBefore(rule, "America/Chicago", "2026-11-01T12:00:00Z")), "2026-10-30T14:30:00.000Z");
});

test("a skipped wall time does not occur and a repeated one occurs once", () => {
  // 2027-03-14 02:30 does not exist in Chicago; 2026-11-01 01:30 happens twice.
  assert.equal(iso(nextScheduledAfter("30 2 14 3 *", "America/Chicago", "2027-03-13T00:00:00Z")), "2028-03-14T07:30:00.000Z");
  assert.equal(iso(nextScheduledAfter("30 1 1 11 *", "America/Chicago", "2026-11-01T00:00:00Z")), "2026-11-01T06:30:00.000Z");
  assert.equal(iso(nextScheduledAfter("30 1 1 11 *", "America/Chicago", "2026-11-01T06:30:00Z")), "2027-11-01T06:30:00.000Z");
});

test("day of month and day of week both restricted match when either does", () => {
  const rule = cronRuleOf("0 0 13 * FRI");
  assert.equal(iso(nextScheduledAfter(rule, "UTC", "2026-10-03T00:00:00Z")), "2026-10-09T00:00:00.000Z");
  assert.equal(iso(nextScheduledAfter(rule, "UTC", "2026-10-09T00:00:00Z")), "2026-10-13T00:00:00.000Z");
});

test("steps, names, nicknames and refusals", () => {
  assert.deepEqual([...cronRuleOf("*/20 * * * *").minutes].sort((a, b) => a - b), [0, 20, 40]);
  assert.equal(iso(nextScheduledAfter("@daily", "UTC", "2026-10-03T00:00:00Z")), "2026-10-04T00:00:00.000Z");
  assert.ok(isScheduledAt("0 4 * * *", "UTC", "2026-10-04T04:00:00Z"));
  assert.ok(!isScheduledAt("0 4 * * *", "UTC", "2026-10-04T04:00:30Z"));
  assert.equal(nextScheduledAfter("0 0 30 2 *", "UTC", "2026-01-01T00:00:00Z"), undefined);
  assert.throws(() => cronRuleOf("61 * * * *"), RangeError);
  assert.throws(() => cronRuleOf("* * * *"), TypeError);
  assert.throws(() => cronRuleOf("TZ=UTC 0 0 * * *"), TypeError);
  assert.throws(() => nextScheduledAfter("@daily", "Mars/Olympus", 0), RangeError);
});
