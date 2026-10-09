/**
 * x402-discovery-snapshot - dated records of a merchant's demand as the x402 Bazaar discovery
 * service reports it, and the day-over-day diff of two such records.
 *
 * Generic: the endpoint URL and the merchant's payTo address are data handed in by the caller
 * (a parameter record); nothing here names a merchant. The reader does not sign, pay, or hold a
 * wallet; the discovery merchant endpoint is keyless. Bazaar sees only calls that went through the
 * facilitator it indexes, so a snapshot is a lower bound on demand, never the whole ledger; the
 * on-chain Transfer ledger is the complement and is a separate reader.
 *
 * A snapshot is a pure function of (response pages, endpoint, payTo, takenAt). Fetching is
 * injected so tests and other hosts supply their own transport.
 */

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const PAGE_LIMIT = 20;
const MAX_PAGES = 50;

export const SNAPSHOT_KIND = "x402.discovery-merchant-snapshot/v1";

/** Validate a parameter record: { endpoint, payTo }. Returns it frozen, or throws. */
export function readSnapshotParameters(record) {
  const { endpoint, payTo } = record ?? {};
  if (typeof endpoint !== "string") throw new TypeError("snapshot parameters: endpoint must be a string URL");
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new TypeError("snapshot parameters: endpoint must be https");
  if (typeof payTo !== "string" || !ADDRESS.test(payTo)) {
    throw new TypeError("snapshot parameters: payTo must be a full 20-byte 0x address");
  }
  return Object.freeze({ endpoint: url.origin + url.pathname, payTo });
}

/** The request URL for one page of the merchant listing. */
export function merchantUrl({ endpoint, payTo }, offset = 0) {
  const url = new URL(endpoint);
  url.searchParams.set("payTo", payTo);
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("offset", String(offset));
  return url.toString();
}

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

/** Reduce one Bazaar resource entry to the fields demand analysis needs (drops payload examples). */
export function resourceEntry(raw) {
  const accept = raw.accepts?.[0] ?? {};
  const quality = raw.quality ?? {};
  return Object.freeze({
    resource: raw.resource,
    serviceName: raw.serviceName ?? null,
    network: accept.network ?? null,
    asset: accept.asset ?? null,
    amount: accept.amount ?? null,
    tags: Object.freeze([...(raw.tags ?? [])]),
    calls30d: num(quality.l30DaysTotalCalls),
    uniquePayers30d: num(quality.l30DaysUniquePayers),
    lastCalledAt: quality.lastCalledAt ?? null,
    lastUpdated: raw.lastUpdated ?? null,
  });
}

/** Build a dated snapshot record from the pages of a merchant listing. */
export function snapshotRecord({ parameters, pages, takenAt }) {
  const { endpoint, payTo } = readSnapshotParameters(parameters);
  const seen = new Map();
  for (const page of pages) {
    for (const raw of page.resources ?? []) seen.set(raw.resource, resourceEntry(raw));
  }
  const resources = [...seen.values()].sort((a, b) => (a.resource < b.resource ? -1 : 1));
  const declared = pages[0]?.pagination?.total ?? null;
  return Object.freeze({
    kind: SNAPSHOT_KIND,
    endpoint,
    payTo,
    takenAt: new Date(takenAt).toISOString(),
    declaredTotal: declared,
    complete: declared === null ? null : declared === resources.length,
    totals: Object.freeze({
      resources: resources.length,
      calls30d: resources.reduce((sum, r) => sum + (r.calls30d ?? 0), 0),
      listedPriceUnits: resources.reduce((sum, r) => sum + BigInt(r.amount ?? 0), 0n).toString(),
    }),
    resources: Object.freeze(resources),
  });
}

/** Fetch every page of the listing through `fetchJson(url) -> object` and return a snapshot. */
export async function takeSnapshot(parameters, { fetchJson, now = () => new Date() }) {
  const pages = [];
  let offset = 0;
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const page = await fetchJson(merchantUrl(readSnapshotParameters(parameters), offset));
    pages.push(page);
    const got = page.resources?.length ?? 0;
    const total = page.pagination?.total ?? 0;
    offset += got;
    if (got === 0 || offset >= total) break;
  }
  return snapshotRecord({ parameters, pages, takenAt: now() });
}

/**
 * Diff two snapshots of the same merchant. `active` lists resources whose lastCalledAt advanced:
 * the only evidence of a new call, since the 30-day counters are rolling windows and can fall
 * without any call having been undone. `newPayerSignals` are resources whose unique payer count rose.
 */
export function diffSnapshots(previous, next) {
  if (previous.payTo.toLowerCase() !== next.payTo.toLowerCase()) {
    throw new Error("diffSnapshots: snapshots are for different payTo addresses");
  }
  const before = new Map(previous.resources.map((r) => [r.resource, r]));
  const after = new Map(next.resources.map((r) => [r.resource, r]));
  const added = next.resources.filter((r) => !before.has(r.resource)).map((r) => r.resource);
  const removed = previous.resources.filter((r) => !after.has(r.resource)).map((r) => r.resource);
  const changed = [];
  for (const [resource, now] of after) {
    const was = before.get(resource);
    if (!was) continue;
    const delta = {
      resource,
      callsDelta: (now.calls30d ?? 0) - (was.calls30d ?? 0),
      uniquePayersDelta: (now.uniquePayers30d ?? 0) - (was.uniquePayers30d ?? 0),
      lastCalledAt: { from: was.lastCalledAt, to: now.lastCalledAt },
      amount: { from: was.amount, to: now.amount },
    };
    const moved = delta.callsDelta !== 0 || delta.uniquePayersDelta !== 0
      || was.lastCalledAt !== now.lastCalledAt || was.amount !== now.amount;
    if (moved) changed.push(delta);
  }
  const advanced = (d) => d.lastCalledAt.to !== null && (d.lastCalledAt.from === null || d.lastCalledAt.to > d.lastCalledAt.from);
  return Object.freeze({
    from: previous.takenAt,
    to: next.takenAt,
    added,
    removed,
    changed,
    active: changed.filter(advanced).map((d) => d.resource),
    newPayerSignals: changed.filter((d) => d.uniquePayersDelta > 0).map((d) => d.resource),
    priceChanges: changed.filter((d) => d.amount.from !== d.amount.to).map((d) => d.resource),
    totalsDelta: Object.freeze({
      resources: next.totals.resources - previous.totals.resources,
      calls30d: next.totals.calls30d - previous.totals.calls30d,
    }),
  });
}
