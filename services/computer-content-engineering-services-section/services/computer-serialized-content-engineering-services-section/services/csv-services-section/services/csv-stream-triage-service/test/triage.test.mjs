import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { admitTriageSpec, parseDeadline, triage } from "../src/triage.mjs";

// Fictional rows and a fictional spec. Real specs are data records owned by whoever uses a source.
const spec = () => ({
  kind: "triage-spec", version: 1, id: "example-notices", source: { url: "https://example.org/notices.csv" },
  filters: [{ column: "Code", in: ["111", "222"] }, { column: "Active", equals: "Yes" }, { column: "Kind", in: ["Sources Sought", "Solicitation"] }],
  deadline: { column: "Due", mustBeAfterRun: true },
  keep: ["Id", "Title", "Kind", "SetAside", "Link"], limit: 2,
});
const header = "Id,Title,Kind,SetAside,Due,Code,Active,Link,Contact,Description";
const csv = [
  header,
  '"n1","Soon, with comma","Sources Sought","","2026-10-14T12:00:00-05:00","111","Yes","https://example.org/n1","a@b.gov","long text"',
  '"n2","Later","Solicitation","SBA","2026-10-21T17:00:00Z","222","Yes","https://example.org/n2","a@b.gov","long text"',
  '"n3","Latest","Solicitation","","2026-12-01T00:00:00Z","111","Yes","https://example.org/n3","a@b.gov","x"',
  '"n4","Wrong code","Solicitation","","2026-10-21T17:00:00Z","999","Yes","https://example.org/n4","a@b.gov","x"',
  '"n5","Inactive","Solicitation","","2026-10-21T17:00:00Z","111","No","https://example.org/n5","a@b.gov","x"',
  '"n6","Past","Solicitation","","2026-09-01T00:00:00Z","111","Yes","https://example.org/n6","a@b.gov","x"',
  '"n7","No deadline","Solicitation","","","111","Yes","https://example.org/n7","a@b.gov","x"',
  '"n8","Bad deadline","Solicitation","","2026-10-21","111","Yes","https://example.org/n8","a@b.gov","x"',
  '"n9","Wrong kind","Award Notice","","2026-10-21T17:00:00Z","111","Yes","https://example.org/n9","a@b.gov","x"',
  "",
].join("\n");
const now = new Date("2026-10-08T17:00:00Z");

test("filters, future-deadline test and ordering, with every drop counted", async () => {
  const record = await triage([csv], spec(), { now });
  assert.deepEqual(record.counts, { scanned: 9, matchedFilters: 6, matched: 3, noDeadline: 1, unparseableDeadline: 1, pastDeadline: 1, malformedRows: 0 });
  assert.deepEqual(record.notices.map((notice) => notice.Id), ["n1", "n2"], "soonest first, limited to 2");
  assert.equal(record.notices[0].deadline, "2026-10-14T17:00:00.000Z", "offset parsed, reported in UTC");
  assert.equal(record.generatedAt, "2026-10-08T17:00:00.000Z");
  assert.equal(record.specId, "example-notices");
});

test("only the columns the spec keeps leave the file: contact and description never do", async () => {
  const record = await triage([csv], spec(), { now });
  const text = JSON.stringify(record);
  assert.ok(!text.includes("a@b.gov") && !text.includes("long text"));
  assert.deepEqual(Object.keys(record.notices[0]), ["Id", "Title", "Kind", "SetAside", "Link", "deadline"]);
});

test("a spec naming a column the file lacks is refused rather than matching nothing", async () => {
  const bad = { ...spec(), filters: [{ column: "NoSuchColumn", equals: "x" }] };
  await assert.rejects(triage([csv], bad, { now }), /lacks columns.*NoSuchColumn/u);
});

test("spec admission refuses malformed specs and the schema file agrees on required fields", () => {
  assert.throws(() => admitTriageSpec({ ...spec(), kind: "other" }), /kind must be/u);
  assert.throws(() => admitTriageSpec({ ...spec(), filters: [{ column: "A" }] }), /exactly one/u);
  assert.throws(() => admitTriageSpec({ ...spec(), source: { url: "http://example.org/x.csv" } }), /https/u);
  assert.throws(() => admitTriageSpec({ ...spec(), keep: [] }), /keep must list/u);
  const schema = JSON.parse(readFileSync(new URL("../data/records/schema/triage-spec.schema.json", import.meta.url), "utf8"));
  for (const key of Object.keys(spec()).filter((k) => !["deadline", "limit"].includes(k))) assert.ok(schema.required.includes(key), key);
});

test("deadlines must be ISO 8601 with an offset", () => {
  assert.equal(parseDeadline("2026-10-14T12:00:00-05:00"), Date.parse("2026-10-14T17:00:00Z"));
  assert.equal(parseDeadline("2026-10-14"), null);
  assert.equal(parseDeadline("2026-10-14T12:00:00"), null);
  assert.equal(parseDeadline(""), null);
});
