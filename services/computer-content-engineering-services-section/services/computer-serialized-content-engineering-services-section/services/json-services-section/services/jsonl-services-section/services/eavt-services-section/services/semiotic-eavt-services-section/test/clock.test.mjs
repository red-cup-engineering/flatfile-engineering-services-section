import assert from "node:assert/strict";
import test from "node:test";
import { isAbsoluteSeavtClock, compareAbsoluteSeavtClocks, sourceClocksVisibleAt } from "../src/clock.mjs";

test("calendar admission rejects normalized impossible dates", () => {
  assert.equal(isAbsoluteSeavtClock("2024-02-29T23:59:59.999-05:00"), true);
  for (const value of [
    "2025-02-29T00:00:00Z", "2026-02-30T00:00:00Z",
    "2026-13-01T00:00:00Z", "yesterday", "2026-10-12",
  ]) assert.equal(isAbsoluteSeavtClock(value), false);
});

test("exact source clocks order nanoseconds without millisecond truncation", () => {
  const ordered = [
    "2026-10-12T13:59:59.999999999Z",
    "2026-10-12T14:00:00.000000001Z",
    "2026-10-12T14:00:00.000000002Z",
    "2026-10-12T14:00:01Z",
  ];
  for (let i = 0; i < ordered.length; i++) for (let j = 0; j < ordered.length; j++) {
    const observed = compareAbsoluteSeavtClocks(ordered[i], ordered[j]);
    assert.equal(observed, Math.sign(i-j));
  }
  assert.equal(compareAbsoluteSeavtClocks(ordered[1], "2026-10-12T09:00:00.000000001-05:00"), 0);
  assert.equal(compareAbsoluteSeavtClocks("2026-10-12T14:00:00.5Z", "2026-10-12T14:00:00.500000Z"), 0);
  assert.equal(compareAbsoluteSeavtClocks("2026-10-12T14:00:00.499999999Z", "2026-10-12T14:00:00.5Z"), -1);
  assert.throws(() => compareAbsoluteSeavtClocks(ordered[0],"2025-02-29T00:00:00Z"), /absolute observation/);
});

test("source-clock admission agrees with the Lean missing-clock and monotonic laws", () => {
  const before = "2026-10-12T14:00:00.000000001Z";
  const after = "2026-10-12T14:00:00.000000002Z";
  const events = {
    publishedAt: "2026-10-12T13:59:59Z",
    receivedAt: "2026-10-12T14:00:00Z",
    observedAt: before,
  };
  assert.equal(sourceClocksVisibleAt(events, before), true);
  assert.equal(sourceClocksVisibleAt(events, after), true);
  for (const key of ["publishedAt","receivedAt","observedAt"]) {
    assert.equal(sourceClocksVisibleAt({ ...events, [key]: undefined }, before), false);
    assert.equal(sourceClocksVisibleAt({ ...events, [key]: after }, before), false);
  }
  assert.equal(sourceClocksVisibleAt({ ...events, observedAt:"2026-10-12T09:00:00.000000001-05:00" }, before), true);
  assert.throws(() => sourceClocksVisibleAt(events, "yesterday"), /absolute instant/);
});
