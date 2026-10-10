import assert from "node:assert/strict";
import test from "node:test";
import { httpDate, parseHttpDate } from "../src/date.mjs";
test("round-trips an HTTP date", ()=>assert.equal(parseHttpDate(httpDate(new Date("2026-08-09T00:00:00Z")))?.toISOString(), "2026-08-09T00:00:00.000Z"));

import { httpDateToJson, jsonToHttpDate } from "../src/date-transformations.mjs";
test("HTTP-date conversion retains RFC examples, explicit year reference and leap notation", () => {
    const canonical = "Sun, 06 Nov 1994 08:49:37 GMT";
    for (const date of [canonical, "Sun Nov  6 08:49:37 1994", "Sunday, 06-Nov-94 08:49:37 GMT"]) {
        const value = httpDateToJson({ date, referenceUnixMilliseconds: 1791331200000 });
        assert.equal(value.httpDate, canonical);
        assert.equal(value.unixMilliseconds, 784111777000);
    }
    assert.throws(() => httpDateToJson({ date: "Sunday, 06-Nov-94 08:49:37 GMT" }), TypeError);
    for (const date of ["1994-11-06", "Mon, 06 Nov 1994 08:49:37 GMT", canonical + "\n", "Sun, 31 Feb 1994 08:49:37 GMT"]) {
        assert.throws(() => httpDateToJson({ date }), TypeError);
        assert.equal(parseHttpDate(date), null);
    }
    const leap = jsonToHttpDate({ year: 2016, month: 12, day: 31, hour: 23, minute: 59, second: 60 });
    assert.equal(leap.httpDate, "Sat, 31 Dec 2016 23:59:60 GMT");
    assert.equal(leap.unixMilliseconds, null);
    assert.equal(leap.leapSecond, true);
});
