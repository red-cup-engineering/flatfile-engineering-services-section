import assert from "node:assert/strict";
import { test } from "node:test";
import { isIsoCalendarDate, parseRfc3339Instant, compareRfc3339Instants as compare } from "../src/time/rfc3339.mjs";

test("Gregorian years, centuries and actual calendar dates", () => {
  for (const v of ["0000-02-29", "0099-12-31", "2000-02-29", "2024-02-29"]) assert.equal(isIsoCalendarDate(v), true);
  for (const v of ["1900-02-29", "2026-02-31", "2026-04-31", "2026-00-01", "2026-13-01", "2026-1-01"]) assert.equal(isIsoCalendarDate(v), false);
  assert.equal(parseRfc3339Instant("0099-01-01T00:00:00Z")?.epochSecond, -59042995200);
});

test("chronological equivalence across zones and current RFC 9557 UTC conventions", () => {
  assert.equal(compare("2026-10-19T01:15:01.50Z", "2026-10-18t20:15:01.500-05:00"), 0);
  assert.equal(compare("2026-10-19T00:00:00+00:00", "2026-10-19T00:00:00-00:00"), 0);
  assert.equal(compare("2026-10-18T00:00:00+05:45", "2026-10-17T18:15:00Z"), 0);
});

test("arbitrary sub-millisecond fractional precision is not silently erased", () => {
  assert.equal(compare("2026-10-19T00:00:00.000000001Z", "2026-10-19T00:00:00Z"), 1);
  assert.equal(compare("2026-10-19T00:00:00.000000001Z", "2026-10-19T00:00:00.000000002Z"), -1);
  assert.equal(compare("2026-10-19T00:00:00.12Z", "2026-10-19T00:00:00.120000Z"), 0);
});

test("invalid calendar, missing zones, impossible clock or leap seconds refuse", () => {
  for (const v of ["2026-02-31T00:00:00Z", "2026-10-19T24:00:00Z", "2026-10-19T12:60:00Z", "2026-10-19T12:00:60Z", "2026-10-19T12:00:00+24:00", "2026-10-19T12:00:00+02:60", "2026-10-19T12:00:00", "2026-10-19", null]) {
    assert.equal(parseRfc3339Instant(v), null, String(v));
    assert.equal(compare("2026-10-19T12:00:00Z", v), null);
  }
});
