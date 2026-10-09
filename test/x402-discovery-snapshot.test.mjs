import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  readSnapshotParameters, merchantUrl, snapshotRecord, takeSnapshot, diffSnapshots, SNAPSHOT_KIND,
} from "../src/x402-discovery-snapshot.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/x402-discovery-merchant-2026-10-08.json", import.meta.url), "utf8"));
const parameters = {
  endpoint: "https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant",
  payTo: fixture.payTo,
};
const taken = (pages, at) => snapshotRecord({ parameters, pages, takenAt: at });

test("parameters: a truncated payTo or non-https endpoint is refused", () => {
  assert.throws(() => readSnapshotParameters({ ...parameters, payTo: "0x32886F6F" }), /payTo/);
  assert.throws(() => readSnapshotParameters({ ...parameters, endpoint: "http://x.test/a" }), /https/);
});

test("merchantUrl carries payTo, limit and offset", () => {
  const url = new URL(merchantUrl(parameters, 20));
  assert.equal(url.searchParams.get("payTo"), fixture.payTo);
  assert.equal(url.searchParams.get("offset"), "20");
});

test("the observed 2026-10-08 response reproduces 14 resources, 27 calls, complete", () => {
  const snap = taken([fixture], "2026-10-08T20:00:00Z");
  assert.equal(snap.kind, SNAPSHOT_KIND);
  assert.equal(snap.totals.resources, 14);
  assert.equal(snap.totals.calls30d, 27);
  assert.equal(snap.complete, true);
  const cdrama = snap.resources.find((r) => r.resource.endsWith("/translate/en-zh/cdrama-subtitles"));
  assert.equal(cdrama.amount, "10000");
  assert.equal(cdrama.lastCalledAt, "2026-10-08T18:06:34.251Z");
  assert.equal(cdrama.uniquePayers30d, 2);
});

test("takeSnapshot pages through the listing and does not double-count", async () => {
  const [a, b] = [fixture.resources.slice(0, 8), fixture.resources.slice(8)];
  const urls = [];
  const fetchJson = async (url) => {
    urls.push(url);
    const offset = Number(new URL(url).searchParams.get("offset"));
    return { ...fixture, resources: offset === 0 ? a : b, pagination: { limit: 20, offset, total: 14 } };
  };
  const snap = await takeSnapshot(parameters, { fetchJson, now: () => new Date("2026-10-08T20:00:00Z") });
  assert.equal(urls.length, 2);
  assert.equal(snap.totals.resources, 14);
  assert.equal(snap.complete, true);
});

test("an incomplete listing is marked, not silently accepted", () => {
  const snap = taken([{ ...fixture, resources: fixture.resources.slice(0, 5) }], "2026-10-08T20:00:00Z");
  assert.equal(snap.complete, false);
});

test("diff: identical snapshots show nothing", () => {
  const snap = taken([fixture], "2026-10-08T20:00:00Z");
  const d = diffSnapshots(snap, taken([fixture], "2026-10-09T20:00:00Z"));
  assert.deepEqual([d.added, d.removed, d.changed, d.active], [[], [], [], []]);
});

test("diff: a new call and new payer surface as active and as a payer signal; a price cut is listed", () => {
  const day1 = taken([fixture], "2026-10-08T20:00:00Z");
  const resources = structuredClone(fixture.resources);
  const target = resources.find((r) => r.resource.endsWith("/base-chain/gas-oracle"));
  target.quality = { l30DaysTotalCalls: 4, l30DaysUniquePayers: 4, lastCalledAt: "2026-10-09T09:00:00.000Z" };
  target.accepts[0].amount = "5000";
  const day2 = taken([{ ...fixture, resources }], "2026-10-09T20:00:00Z");
  const d = diffSnapshots(day1, day2);
  assert.deepEqual(d.active, [target.resource]);
  assert.deepEqual(d.newPayerSignals, [target.resource]);
  assert.deepEqual(d.priceChanges, [target.resource]);
  assert.equal(d.totalsDelta.calls30d, 1);
});

test("diff: a falling rolling counter is not read as activity", () => {
  const day1 = taken([fixture], "2026-10-08T20:00:00Z");
  const resources = structuredClone(fixture.resources);
  resources[0].quality.l30DaysTotalCalls -= 1;
  const d = diffSnapshots(day1, taken([{ ...fixture, resources }], "2026-10-09T20:00:00Z"));
  assert.deepEqual(d.active, []);
  assert.equal(d.changed[0].callsDelta, -1);
});

test("diff refuses snapshots of different merchants", () => {
  const a = taken([fixture], "2026-10-08T20:00:00Z");
  const b = { ...a, payTo: "0x" + "1".repeat(40) };
  assert.throws(() => diffSnapshots(a, b), /different payTo/);
});
