import assert from "node:assert/strict";
import test from "node:test";
import { httpDate, parseHttpDate } from "../src/date.mjs";
test("round-trips an HTTP date", ()=>assert.equal(parseHttpDate(httpDate(new Date("2026-08-09T00:00:00Z")))?.toISOString(), "2026-08-09T00:00:00.000Z"));
