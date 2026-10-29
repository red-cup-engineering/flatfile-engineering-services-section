import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyNormalizedSemanticContent } from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";

import {
  entry, sameEntry, isEntry, asEntry, assertValidEntry,
  seavt, isSeavt, asSeavt, assertValidSeavt, readSeavt,
  identifySeavtSemanticContent,
} from "../src/row.mjs";

test("entry builds a plain e/a/v/t record with no charge and no trace", () => {
  const row = entry("urn:subject:1", "urn:rmn:predicate:observed", 42, "2026-07-31T00:00:00.000Z");
  assert.deepEqual(row, {
    e: "urn:subject:1",
    a: "urn:rmn:predicate:observed",
    v: 42,
    t: "2026-07-31T00:00:00.000Z",
  });
  assert.equal("charge" in row, false);
  assert.equal("trace" in row, false);
});

test("entry rejects a missing predicate", () => {
  assert.throws(() => entry("s", undefined, "v", "t"), /field "a" is required/);
});

test("entry rejects a non-JSON value", () => {
  assert.throws(() => entry("s", "p", () => {}, "t"), TypeError);
});

test("entry honors a supplied predicate validator", () => {
  const predicateIsValid = (p) => p === "urn:rmn:known-term";
  assert.throws(
    () => entry("s", "urn:rmn:unknown-term", "v", "t", { predicateIsValid }),
    /RMN-term check/,
  );
  const row = entry("s", "urn:rmn:known-term", "v", "t", { predicateIsValid });
  assert.equal(row.a, "urn:rmn:known-term");
});

test("generic JSON EAVT exposes comparison but no semantic identity mint", () => {
  assert.equal(sameEntry(entry("s", "p", "v", "t"), ["s", "p", "v", "t"]), true);
});

test("sameEntry compares by canonical content, not field order", () => {
  const a = { e: "s", a: "p", v: "v", t: "t" };
  const b = { t: "t", v: "v", a: "p", e: "s" };
  assert.equal(sameEntry(a, b), true);
});

test("isEntry / asEntry accept object and tuple spelling, reject malformed rows", () => {
  assert.equal(isEntry({ e: "s", a: "p", v: "v", t: "t" }), true);
  assert.equal(isEntry(["s", "p", "v", "t"]), true);
  assert.equal(isEntry({ e: "s", a: "p" }), false);
  assert.equal(isEntry(null), false);
  assert.deepEqual(asEntry(["s", "p", "v", "t"]), { e: "s", a: "p", v: "v", t: "t" });
  assert.throws(() => assertValidEntry(["s", "p", "v"]), /four/);
});

const mark = (name) => ["mark", name];

test("SEAVT stores closed typed RMN coordinates directly as JSON arrays", () => {
  const row = seavt(mark("order.payment"), mark("payment.receipt"), mark("receipt-delay"), "2026-08-02T00:00:00.000Z");
  assert.deepEqual(row, {
    e: ["mark", "order.payment"],
    a: ["mark", "payment.receipt"],
    v: ["mark", "receipt-delay"],
    t: "2026-08-02T00:00:00.000Z",
  });
  assert.deepEqual(readSeavt(row), row);
});

test("SEAVT refuses SRN strings, unclosed terms, and malformed RMN arrays", () => {
  for (const row of [
    { e: "order.payment", a: mark("observed"), v: mark("receipt"), t: "t" },
    { e: ["var", 0], a: mark("observed"), v: mark("receipt"), t: "t" },
    { e: ["unknown-form"], a: mark("observed"), v: mark("receipt"), t: "t" },
  ]) {
    assert.equal(isSeavt(row), false);
    assert.throws(() => assertValidSeavt(row), /SEAVT row/);
  }
});

test("SEAVT source has no stored identity, charge, or trace", () => {
  const source = seavt(mark("order.payment"), mark("payment.receipt"), mark("receipt-delay"), { at: "now" });
  const sameSource = { t: { at: "now" }, v: mark("receipt-delay"), a: mark("payment.receipt"), e: mark("order.payment") };
  assert.equal(sameEntry(source, sameSource), true);
  assert.deepEqual(asSeavt([mark("order.payment"), mark("payment.receipt"), mark("receipt-delay"), { at: "now" }]), source);
  assert.equal("charge" in source, false);
  assert.equal("trace" in source, false);
  assert.equal("token" in source, false);
});

test("strict SEAVT v3 identity commits direct RMN coordinates, time, and explicit custody", () => {
  const source = seavt(mark("order.payment"), mark("payment.receipt"), mark("receipt-delay"), "2026-08-02T00:00:00.000Z");
  const custody = { kind: "witness-journal.log.custody", feed: "semiotic", partition: "2026-08-02" };
  const identified = identifySeavtSemanticContent(source, custody);

  assert.equal(identified.material.kind, "witness-journal.seavt.semantic-content");
  assert.equal(identified.material.version, 3);
  assert.deepEqual(identified.source, source);
  assert.deepEqual(identified.material.witness, {
    kind: "witness-journal.seavt.time-custody-witness",
    version: 1,
    time: source.t,
    custody,
  });
  assert.deepEqual(identified.material.coordinates, { e: source.e, a: source.a, v: source.v });
  assert.equal(verifyNormalizedSemanticContent(identified.token, identified.envelope), true);
  assert.equal(
    verifyNormalizedSemanticContent(identified.witnessIdentity.token, identified.witnessIdentity.envelope),
    true,
  );
  assert.equal("charge" in identified.material, false);
  assert.notEqual(
    identifySeavtSemanticContent(source, { ...custody, feed: "other" }).token,
    identified.token,
  );
  assert.notEqual(
    identifySeavtSemanticContent({ ...source, t: "2026-08-03T00:00:00.000Z" }, custody).token,
    identified.token,
  );
});

test("strict semantic identity refuses generic JSON EAVT and non-JSON custody", () => {
  assert.throws(
    () => identifySeavtSemanticContent(entry("subject", { predicate: true }, 4, "t"), { feed: "generic" }),
    /SEAVT row/u,
  );
  assert.throws(
    () => identifySeavtSemanticContent(seavt(mark("order"), mark("payment"), mark("receipt"), "t"), () => {}),
    /custody witness/u,
  );
});
