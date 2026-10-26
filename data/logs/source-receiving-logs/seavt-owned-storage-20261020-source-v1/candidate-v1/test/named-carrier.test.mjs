import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { seavtOfJson, seavtRow } from "../src/admit-seavt-row.mjs";
import { lineOfRow, rowOfLine, rowsEqual, SEAVT_CARRIER_PROFILE, SEAVT_NAMED_CARRIER_PROFILE } from "../src/seavt-carrier.mjs";
import { appendSeavtRow, appendSeavtRows, readSeavtFeed } from "../src/seavt-log.mjs";
import { logFile } from "../src/layout.mjs";
import schema from "../data/schemas/seavt-named-carrier.schema.json" with { type: "json" };

const T = "2026-10-20T11:30:00.000Z";
const carrier = (row) => lineOfRow(row, { carrierProfile: SEAVT_NAMED_CARRIER_PROFILE });
const roundtrip = (row) => JSON.parse(JSON.stringify(carrier(row)));

test("opt-in named carrier is a typed v2 source; compact v1 remains the default", () => {
  const original = seavtOfJson("subject", "metric", { observations: [null, true, 7, "中文"] }, T);
  const compact = lineOfRow(original);
  assert.equal(SEAVT_CARRIER_PROFILE, "seavt-row-json-carrier/1");
  assert.equal(compact.ej, "subject");
  assert.equal(Object.hasOwn(compact, "carrierProfile"), false);
  const named = roundtrip(original);
  assert.deepEqual(Object.keys(named), ["carrierProfile", "filedAt", "entityJson", "attributeJson", "valueJson"]);
  assert.equal(named.carrierProfile, SEAVT_NAMED_CARRIER_PROFILE);
  assert.equal(named.filedAt, T);
  assert.equal(named.entityJson, "subject");
  assert.equal(named.attributeJson, "metric");
  assert.deepEqual(named.valueJson, { observations: [null, true, 7, "中文"] });
  assert.equal(validateJsonSchema(named, schema).valid, true);
  assert.ok(rowsEqual(rowOfLine(named), original));
  assert.ok(rowsEqual(rowOfLine(JSON.parse(JSON.stringify(compact))), original));
});

test("named source keeps non-bridge SEN terms, arbitrary witness time and original identity", () => {
  const bare = ["mark", JSON.stringify("bare")];
  const row = seavtRow({ e: bare, a: jsonToTerm("measured"), v: jsonToTerm({ item: null }), t: "2026-10-19" });
  const named = lineOfRow(row, { at: T, carrierProfile: SEAVT_NAMED_CARRIER_PROFILE });
  assert.deepEqual(named.entityTerm, bare);
  assert.equal(named.attributeJson, "measured");
  assert.deepEqual(named.valueJson, { item: null });
  assert.equal(named.filedAt, T);
  assert.equal(named.witnessTime, "2026-10-19");
  assert.ok(validateJsonSchema(named, schema).valid);
  assert.ok(rowsEqual(rowOfLine(JSON.parse(JSON.stringify(named))), row));
  assert.equal(rowOfLine(named).t, "2026-10-19");
});

test("schema and original reader refuse competing fields, invented approval and unknown profile", () => {
  const item = roundtrip(seavtOfJson("s", "p", 1, T));
  const alterations = [
    { ...item, entityTerm: ["mark", JSON.stringify("fake")] },
    Object.fromEntries(Object.entries(item).filter(([key]) => key !== "entityJson")),
    { ...item, carrierProfile: "seavt-row-json-carrier/3" },
    { ...item, approved: true },
    { ...item, filedAt: "2026-02-30T00:00:00.000Z" },
    { ...item, valueTerm: "not-an-SEN-term" },
    { ...item, at: T },
  ];
  for (const malformed of alterations) {
    assert.throws(() => rowOfLine(malformed), TypeError);
  }
  for (const malformed of alterations.filter(x => x.filedAt !== "2026-02-30T00:00:00.000Z")) {
    assert.equal(validateJsonSchema(malformed, schema).valid, false);
  }
  assert.throws(() => lineOfRow(seavtOfJson("s", "p", 1, T), { carrierProfile: "invalid" }), /unknown SEAVT carrier profile/);
  assert.throws(() => rowOfLine({ ...item, carrierProfile: SEAVT_CARRIER_PROFILE }), /unknown SEAVT carrier profile/);
});

test("the original append/read writer accepts explicitly named and compact lines in one feed", t => {
  const root = mkdtempSync(join(tmpdir(), "seavt-named-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const rows = [
    seavtOfJson("one", "claim", { n: 1 }, T),
    seavtOfJson("two", "claim", { n: 2 }, "2026-10-20T11:30:01.000Z"),
    seavtOfJson("three", "claim", { n: 3 }, "2026-10-20T11:30:02.000Z"),
  ];
  assert.equal(appendSeavtRow(root, "named-carrier", rows[0]), true);
  assert.equal(appendSeavtRow(root, "named-carrier", rows[1], { carrierProfile: SEAVT_NAMED_CARRIER_PROFILE }), true);
  assert.equal(appendSeavtRows(root, "named-carrier", [rows[2]], { carrierProfile: SEAVT_NAMED_CARRIER_PROFILE }), 1);
  const written = readFileSync(logFile(root, "named-carrier", "2026-10-20"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(Object.hasOwn(written[0], "carrierProfile"), false);
  for (const entry of written.slice(1)) {
    assert.equal(entry.carrierProfile, SEAVT_NAMED_CARRIER_PROFILE);
    assert.equal(validateJsonSchema(entry, schema).valid, true);
  }
  const read = [...readSeavtFeed(root, "named-carrier")].map(({ row }) => row);
  assert.equal(read.length, rows.length);
  read.forEach((row, i) => assert.ok(rowsEqual(row, rows[i]), "read " + i));
});

test("named field overhead is bounded for representative data; do not turn it on by default", () => {
  const row = seavtOfJson("ni:///sha-256;abc", "market:orderbook",
    { provenance: "actual source", payload: "x".repeat(4096), amounts: [1, 2, 3] }, T);
  const compact = JSON.stringify(lineOfRow(row)).length;
  const named = JSON.stringify(roundtrip(row)).length;
  const oldSpines = JSON.stringify({ e: row.e, a: row.a, v: row.v, t: row.t }).length;
  assert.ok(named > compact, "named keys have a real byte cost");
  assert.ok(named < compact * 1.05, "named keys must add under five percent to this representative 4-KiB source");
  assert.ok(named * 4 < oldSpines, "named representation must remain markedly smaller than old term spines");
});
