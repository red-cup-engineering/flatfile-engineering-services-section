import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readSnapshotParameters, merchantUrl, resourceEntry, snapshotRecord, takeSnapshot, diffSnapshots, SNAPSHOT_KIND,
} from "../src/x402-discovery-snapshot.mjs";

// Synthetic data only: example.test hosts and a placeholder address. No real merchant appears here.
const PAY_TO = "0x" + "ab".repeat(20);
const parameters = { endpoint: "https://discovery.example.test/merchant", payTo: PAY_TO };
const entry = (name, { amount = "10000", calls = 1, payers = 1, last = "2026-01-01T00:00:00.000Z" } = {}) => ({
  accepts: [{ amount, asset: "0x" + "cd".repeat(20), network: "eip155:8453", payTo: PAY_TO, scheme: "exact" }],
  lastUpdated: "2026-01-01T00:00:00.000Z",
  quality: { l30DaysTotalCalls: calls, l30DaysUniquePayers: payers, lastCalledAt: last },
  resource: `https://shop.example.test/${name}`,
  serviceName: name,
  tags: ["t"],
});
const listing = (resources, total = resources.length) => ({
  pagination: { limit: 20, offset: 0, total }, payTo: PAY_TO, resources, x402Version: 2,
});
const base = () => listing([entry("a", { calls: 2, payers: 2 }), entry("b"), entry("c", { amount: "40000", calls: 0, payers: 0, last: null })]);
const taken = (pages, at) => snapshotRecord({ parameters, pages, takenAt: at });
const withResources = (fn) => { const l = base(); fn(l.resources); return l; };

test("parameters: a truncated payTo or non-https endpoint is refused", () => {
  assert.throws(() => readSnapshotParameters({ ...parameters, payTo: "0x32886F6F" }), /payTo/);
  assert.throws(() => readSnapshotParameters({ ...parameters, endpoint: "http://x.test/a" }), /https/);
});

test("merchantUrl carries payTo, limit and offset", () => {
  const url = new URL(merchantUrl(parameters, 20));
  assert.equal(url.searchParams.get("payTo"), PAY_TO);
  assert.equal(url.searchParams.get("offset"), "20");
});

test("a listing reduces to a complete, sorted snapshot with totals", () => {
  const snap = taken([base()], "2026-01-02T00:00:00Z");
  assert.equal(snap.kind, SNAPSHOT_KIND);
  assert.equal(snap.totals.resources, 3);
  assert.equal(snap.totals.calls30d, 3);
  assert.equal(snap.totals.listedPriceUnits, "60000");
  assert.equal(snap.complete, true);
  assert.deepEqual(snap.resources.map((r) => r.serviceName), ["a", "b", "c"]);
  assert.equal(snap.resources[0].uniquePayers30d, 2);
});

test("takeSnapshot pages through the listing and does not double-count", async () => {
  const all = base().resources;
  const urls = [];
  const fetchJson = async (url) => {
    urls.push(url);
    const offset = Number(new URL(url).searchParams.get("offset"));
    return listing(offset === 0 ? all.slice(0, 2) : all.slice(2), 3);
  };
  const snap = await takeSnapshot(parameters, { fetchJson, now: () => new Date("2026-01-02T00:00:00Z") });
  assert.equal(urls.length, 2);
  assert.equal(snap.totals.resources, 3);
  assert.equal(snap.complete, true);
});

test("takeSnapshot: an empty page before the total, and the page cap, make the record incomplete", async () => {
  const empty = await takeSnapshot(parameters, { fetchJson: async () => listing([], 5) });
  assert.equal(empty.complete, false);
  assert.match(empty.problems.join(), /empty page/);
  let n = 0;
  const endless = await takeSnapshot(parameters, { fetchJson: async () => listing([entry(`r${n++}`)], 100000) });
  assert.equal(endless.complete, false);
  assert.match(endless.problems.join(), /page cap/);
});

test("an incomplete listing is marked, not silently accepted", () => {
  const snap = taken([listing(base().resources.slice(0, 2), 3)], "2026-01-02T00:00:00Z");
  assert.equal(snap.complete, false);
});

test("a changing total, duplicate URLs, and multi-option pricing are recorded as problems", () => {
  const r = base().resources;
  const snap = taken([listing(r.slice(0, 2), 3), listing([r[2], r[0]], 4)], "2026-01-02T00:00:00Z");
  assert.equal(snap.complete, false);
  assert.match(snap.problems.join("|"), /total changed/);
  assert.match(snap.problems.join("|"), /duplicate resource/);
  const multi = withResources((rs) => rs[0].accepts.push({ ...rs[0].accepts[0], amount: "5" }));
  assert.match(taken([multi], "2026-01-02T00:00:00Z").problems.join(), /several accepts/);
});

test("a response for a different payTo is refused, not recorded under the requested one", () => {
  const other = { ...base(), payTo: "0x" + "11".repeat(20) };
  assert.throws(() => taken([other], "2026-01-02T00:00:00Z"), /payTo/);
  const inner = withResources((rs) => { rs[1].accepts[0].payTo = "0x" + "22".repeat(20); });
  assert.throws(() => taken([inner], "2026-01-02T00:00:00Z"), /accepts payTo/);
});

test("resourceEntry: null counters stay null, bad amounts do not throw, missing resource is refused", () => {
  const e = resourceEntry({ ...entry("n"), quality: { l30DaysTotalCalls: null, l30DaysUniquePayers: "x" } });
  assert.equal(e.calls30d, null);
  assert.equal(e.uniquePayers30d, null);
  const bad = withResources((rs) => { rs[0].accepts[0].amount = "0.5"; });
  const snap = taken([bad], "2026-01-02T00:00:00Z");
  assert.equal(snap.resources[0].amount, null);
  assert.equal(snap.complete, false);
  assert.throws(() => resourceEntry({ accepts: [] }), /resource must be/);
  assert.throws(() => taken([listing([{ serviceName: "x" }], 1)], "2026-01-02T00:00:00Z"), /resource must be/);
});

test("diff: identical snapshots show nothing", () => {
  const snap = taken([base()], "2026-01-02T00:00:00Z");
  const d = diffSnapshots(snap, taken([base()], "2026-01-03T00:00:00Z"));
  assert.deepEqual([d.added, d.removed, d.changed, d.active, d.newPayerSignals], [[], [], [], [], []]);
  assert.equal(d.incomplete, false);
});

test("diff: a new call and new payer surface as active and as a payer signal; a price cut is listed", () => {
  const day1 = taken([base()], "2026-01-02T00:00:00Z");
  const day2l = withResources((rs) => {
    rs[1].quality = { l30DaysTotalCalls: 2, l30DaysUniquePayers: 2, lastCalledAt: "2026-01-03T09:00:00.000Z" };
    rs[1].accepts[0].amount = "5000";
  });
  const d = diffSnapshots(day1, taken([day2l], "2026-01-03T20:00:00Z"));
  const target = day2l.resources[1].resource;
  assert.deepEqual(d.active, [target]);
  assert.deepEqual(d.newPayerSignals, [target]);
  assert.deepEqual(d.priceChanges, [target]);
  assert.equal(d.totalsDelta.calls30d, 1);
});

test("diff: a newly listed resource that already has a caller is active and a payer signal", () => {
  const day1 = taken([base()], "2026-01-02T00:00:00Z");
  const fresh = entry("new", { calls: 1, payers: 1, last: "2026-01-03T01:00:00.000Z" });
  const l = base(); l.resources.push(fresh); l.pagination.total = 4;
  const d = diffSnapshots(day1, taken([l], "2026-01-03T20:00:00Z"));
  assert.deepEqual(d.added, [fresh.resource]);
  assert.deepEqual(d.active, [fresh.resource]);
  assert.deepEqual(d.newPayerSignals, [fresh.resource]);
});

test("diff: activity with an unchanged payer count is listed as activeWithoutPayerRise (churn can hide a new payer)", () => {
  const day1 = taken([base()], "2026-01-02T00:00:00Z");
  const l = withResources((rs) => { rs[0].quality.lastCalledAt = "2026-01-03T09:00:00.000Z"; });
  const d = diffSnapshots(day1, taken([l], "2026-01-03T20:00:00Z"));
  assert.deepEqual(d.active, [l.resources[0].resource]);
  assert.deepEqual(d.newPayerSignals, []);
  assert.deepEqual(d.activeWithoutPayerRise, [l.resources[0].resource]);
});

test("diff: a falling rolling counter is not read as activity", () => {
  const day1 = taken([base()], "2026-01-02T00:00:00Z");
  const l = withResources((rs) => { rs[0].quality.l30DaysTotalCalls -= 1; });
  const d = diffSnapshots(day1, taken([l], "2026-01-03T00:00:00Z"));
  assert.deepEqual(d.active, []);
  assert.equal(d.changed[0].callsDelta, -1);
});

test("diff: an incomplete side is flagged", () => {
  const ok = taken([base()], "2026-01-02T00:00:00Z");
  const partial = taken([listing(base().resources.slice(0, 2), 3)], "2026-01-03T00:00:00Z");
  assert.equal(diffSnapshots(ok, partial).incomplete, true);
});

test("diff refuses snapshots of different merchants or endpoints", () => {
  const a = taken([base()], "2026-01-02T00:00:00Z");
  assert.throws(() => diffSnapshots(a, { ...a, payTo: "0x" + "1".repeat(40) }), /different payTo/);
  assert.throws(() => diffSnapshots(a, { ...a, endpoint: "https://other.example.test/m" }), /different endpoints/);
});


test("unknown call and payer counts do not create zero totals or a false new-payer signal", () => {
  const beforeListing = withResources((rs) => {
    rs[0].quality.l30DaysTotalCalls = null;
    rs[0].quality.l30DaysUniquePayers = null;
  });
  const afterListing = withResources((rs) => {
    rs[0].quality.l30DaysTotalCalls = 3;
    rs[0].quality.l30DaysUniquePayers = 3;
  });
  const before = taken([beforeListing], "2026-01-02T00:00:00Z");
  const after = taken([afterListing], "2026-01-03T00:00:00Z");
  assert.equal(before.complete, true, "complete listing does not imply measured demand");
  assert.equal(before.totals.calls30d, null, "one missing count makes the aggregate unknown");
  assert.equal(after.totals.calls30d, 4);
  const diff = diffSnapshots(before, after);
  const item = diff.changed.find((row) => row.resource === afterListing.resources[0].resource);
  assert.ok(item, "measurement coverage changed");
  assert.equal(item.callsDelta, null);
  assert.equal(item.uniquePayersDelta, null);
  assert.equal(diff.totalsDelta.calls30d, null);
  assert.equal(diff.newPayerSignals.includes(item.resource), false,
    "no positive payer delta can be inferred without its baseline");
});

test("malformed discovery counters stay unknown instead of coercing arrays, whitespace or fractions", () => {
  const bad = resourceEntry({
    ...entry("malformed"), quality: {
      l30DaysTotalCalls: [], l30DaysUniquePayers: " ",
    },
  });
  assert.equal(bad.calls30d, null);
  assert.equal(bad.uniquePayers30d, null);
  for (const value of [0.25, "2.5", -1, "NaN", "9007199254740993", {}, true]) {
    assert.equal(resourceEntry({ ...entry("invalid"), quality: {
      l30DaysTotalCalls: value, l30DaysUniquePayers: value,
    } }).calls30d, null);
  }
});

test("last-called activity compares actual instants, not ISO offset strings or invalid claims", () => {
  const beforeListing = withResources((rs) => {
    rs[1].quality.lastCalledAt = "2026-01-02T23:30:00-05:00";
  });
  const before = taken([beforeListing], "2026-01-03T05:00:00Z");
  const earlierListing = withResources((rs) => {
    rs[1].quality.lastCalledAt = "2026-01-03T03:00:00Z";
  });
  const earlier = diffSnapshots(before, taken([earlierListing], "2026-01-03T06:00:00Z"));
  assert.deepEqual(earlier.active, [], "different timezone spelling is not a later call");
  const laterListing = withResources((rs) => {
    rs[1].quality.lastCalledAt = "2026-01-03T05:00:00Z";
  });
  const later = diffSnapshots(before, taken([laterListing], "2026-01-03T06:00:00Z"));
  assert.deepEqual(later.active, [laterListing.resources[1].resource]);
  const invalidListing = withResources((rs) => {
    rs[1].quality.lastCalledAt = "yesterday";
  });
  const invalid = diffSnapshots(before, taken([invalidListing], "2026-01-03T06:00:00Z"));
  assert.deepEqual(invalid.active, [], "an unparseable source time cannot establish activity");
  const yearOnlyListing = withResources((rs) => {
    rs[1].quality.lastCalledAt = "2027";
  });
  assert.deepEqual(diffSnapshots(before, taken([yearOnlyListing], "2026-01-03T06:00:00Z")).active, [],
    "a valid-looking date fragment is not a qualified timestamp");
});

test("known active calls without a payer baseline retain an explicitly unknown payer reading", () => {
  const beforeListing = withResources((rs) => {
    rs[1].quality.l30DaysUniquePayers = null;
  });
  const afterListing = withResources((rs) => {
    rs[1].quality.l30DaysUniquePayers = 2;
    rs[1].quality.lastCalledAt = "2026-01-04T09:00:00Z";
  });
  const d = diffSnapshots(
    taken([beforeListing], "2026-01-03T00:00:00Z"),
    taken([afterListing], "2026-01-04T20:00:00Z"),
  );
  assert.deepEqual(d.active, [afterListing.resources[1].resource]);
  assert.deepEqual(d.newPayerSignals, []);
  assert.deepEqual(d.activeWithoutPayerRise, [afterListing.resources[1].resource]);
});
