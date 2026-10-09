# x402 discovery merchant snapshot: spec and design

Status: first increment. Every claim is marked Observed (inspected 2026-10-08), Inferred, or Untested.

## Spec

Purpose: record, as dated data, the demand the x402 Bazaar discovery service reports for one
merchant `payTo`, and diff two records, so a seller can tell "a new payer arrived" from "nothing
happened" within a day, without a wallet, key, or account.

Requirements:

1. R1. Input is a parameter record `{ endpoint, payTo }` (data, not code). `payTo` must be a full
   20-byte address; endpoint must be https.
2. R2. Output is a snapshot record: per-resource listed price, 30-day calls, 30-day unique payers,
   `lastCalledAt`, plus totals and a `complete` flag (declared total equals resources read).
3. R3. A diff of two snapshots lists added/removed resources, per-resource deltas, `active`
   (lastCalledAt advanced), `newPayerSignals`, `priceChanges`.
4. R4. The reader never pays, signs, or reads secrets.

Non-requirements: it does not claim to be the whole ledger. Bazaar indexes only calls that passed
through its facilitator (Inferred from the 27 vs 28 reconciliation below); on-chain Transfer events
to `payTo` are the complement and will be a second reader in this section.

## Observed basis

- Observed: `GET {endpoint}?payTo=0x32886F6F...` with no auth returns `{pagination, payTo, resources[],
  x402Version}`; 14 resources, `pagination.total` 14, each with `accepts[0]` (scheme exact,
  eip155:8453, USDC asset, amount in 6-decimal units), `serviceName`, `tags`, `lastUpdated`, and
  `quality.{l30DaysTotalCalls, l30DaysUniquePayers, lastCalledAt}`. The sum of l30DaysTotalCalls is 27.
- Observed: the live `https://market.561.group/v1/koios/briefing/current` returns HTTP 402 with a
  `payment-required` header (x402 v2, exact, 250000 units, same payTo). It is not among the 14 listed
  resources, so the Bazaar listing has no demand record for it. (Absence from the listing is
  Observed; why it is absent is Untested.)
- Reported by the move's earlier checks, not re-run here: on-chain reconciliation of 28 transfers /
  $0.439 against Bazaar's 27 calls / ~$0.429.

## Design (LLD)

`src/x402-discovery-snapshot.mjs`, exported as `./x402-discovery-snapshot`.

- `readSnapshotParameters(record)` validates R1.
- `merchantUrl(parameters, offset)` builds one page request (limit 20).
- `takeSnapshot(parameters, { fetchJson, now })` pages until `offset >= total` (hard cap 50 pages).
  Transport is injected; the module has no network code and no dependencies.
- `snapshotRecord({ parameters, pages, takenAt })` is the pure reducer. It drops payload examples
  (large, not demand data), sorts by resource, de-duplicates by resource URL.
- `diffSnapshots(previous, next)` is pure. `active` uses `lastCalledAt` advancing, never the 30-day
  counters, because those are rolling windows and fall as old calls age out.

Test data: `test/fixtures/x402-discovery-merchant-2026-10-08.json` is the Observed response with
payload examples removed, labeled TEST DATA in a `_fixture` field. It is not a record of record.

## Where the data goes (not decided here)

The parameter record (`payTo`, endpoint) and the daily snapshots are the Group's holdings, so they
belong in 561-group, in whichever repo holds the market parameters. That repo is not yet located:
Observed in the move's earlier checks that code search across 561-group, causeway-services,
coesite-operations and red-cup-engineering finds no Worker serving the paid routes. Until it is
located, no daily run should write records anywhere; this PR adds the reader only.

## Next increments

1. A runner that reads the parameter record and writes the snapshot where the holdings repo says
   (Untested; depends on the carrier being located).
2. EVM Transfer-ledger reader (token, recipient, fromBlock checkpoint in; per-day count, sum,
   distinct senders, per-sender breadth out), with a Group-address flag list so self-purchases are
   never counted as demand. Fixture from the 28 transfers (not included here; not re-observed by this PR).
3. Cross-check: for each `active` resource, confirm a matching on-chain transfer (Untested).
4. Price test: only after the carrier is located and the owner decides a price.

## Honest headline the reader supports today

Observed: no organic buyer is shown; at most 3 calls per listed resource in 30 days, 27 in total.
Bazaar does not show whether any of the payers are the Group's own wallets; that needs the flag list.
