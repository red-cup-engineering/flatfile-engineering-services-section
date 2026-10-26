# Semiotic EAVT — typed observation and source-time storage

**Owner:** Red Cup Engineering, Computer Data Engineering, beneath
the existing JSONL/EAVT section. **Package:**
`@red-cup-engineering/semiotic-eavt-services-section`.

This package implements the SEAVT *carrier and storage* boundary. It
does not declare a new semantics for claims, replace Obsmetrologia's
FOUR, grant resource rights, derive causal precedence from a clock, or
certify scientific results. Use the actual exports in
[package.json](package.json), not the retired Code Engineering package
path or an old duplicated September specification.

## The SCA → SEN → SEAVT contract

- **SCA** identifies canonical content bytes or an admitted SignCell
  triple; a digest alone says nothing about truth, authorization or
  the identity of a claimed issuer.
- **SEN** supplies closed, inferably typed expressions. The
  [admission module](src/admit-seavt-row.mjs) exports
  `seavtRow({e,a,v,t})`, `seavt(e,a,v,t)`,
  `seavtOfJson(entity,attribute,value,time)`,
  `seavtOfSignCell(cell,observedAt)`, and
  `signCellOfSeavt(row)`.
- **SEAVT** retains a witnessed-at fourth field `t`. The generic
  row admission checks the EAVT shape and the SEN typing/closure of
  `e/a/v`; **it does not authenticate `t`**. SignCell projection
  and the resource-head policy additionally require an absolute
  observation clock. Source attestation is separately owned.
- `seavtOfSignCell` retains the canonical SignCell address as the
  row subject and the entire SignCell as the typed value, including
  independent positive and negative evidence. Adding evidence can
  change an observation's address without renaming the original
  predication. `signCellOfSeavt` refuses a changed cell address,
  attribute, or malformed cell; it cannot authenticate the issuer
  beyond whatever its input provider has already qualified.
- `normalizeSeavtRow` normalizes **carrier representation** only,
  not semantic expression reduction or the erasure of a distinct
  observation time.

These implementations give a usable **one-address / three-term /
four-field presentation**, not a mathematical theorem that a data
schema has one, three, or four physical dimensions. See the actual
[Science L-Space account](https://github.com/lenticule-science/science-services-section/blob/main/services/information-science-services-section/services/language-science-services-section/content/text/documents/articles/notes/2026/10/10/2026-10-10-note-about-l-space.md)
and [LS-SAS-001](https://github.com/lenticule-science/linguistics-services-section/blob/main/specifications/l-space-semantic-architecture.md)
for proof scope and the required causal/geometry preservation laws.

## Time, effects and storage

[clock.mjs](src/clock.mjs) admits complete absolute instants,
rejects impossible dates, and compares fractional seconds without
truncating to JavaScript's millisecond resolution.
`sourceClocksVisibleAt` refuses when publication, receipt,
observation, or cutoff is missing or later than the requested
source-time boundary. **`observedAt` is supplied evidence, not
a credentialed clock oracle.**

[causal-resource-head.mjs](src/causal-resource-head.mjs) preserves
immutable original observations and keeps a **source-time latest
projection**, including multiple equal-time observations. Its
`receive` and `read` do not imply that a later timestamp caused,
refuted, superseded in authority, or settled an earlier report.
A causal frontier needs an independently admitted partial-order
relation; chronological order alone cannot provide one.

The [native store](src/store.mjs) owns content-addressed immutable
records, mutable named heads, and chronological logs. Its
[storage specification](content/text/documents/specifications/store.md)
governs layout, memory and failure assumptions; do not install
another EAVT ledger or witness engine to publish the same data.

## Executable receiving

Run the existing package tests in a workspace where its declared
`workspace:*` dependencies are installed:

```sh
node --test test/seavt-carriers.test.mjs test/signcell-seavt.test.mjs test/clock.test.mjs test/causal-resource-head.test.mjs
node --test test/*.test.mjs
```

The tests check typed coordinates, independent FOUR testimony,
stable predication identity, distinct event times, source-calendar
and submillisecond order, forged-identity refusal, immutable older
observations, and same-time conflicting source reports. Tests
remain source-level evidence until executed at the exact installed
revision. The [L-Space engineering LLD](https://github.com/red-cup-engineering/capability-cell-fabrication-services-section/blob/main/specifications/l-space-lld.md)
requires a separate real provider/source observation and receiving
office before the Group claims installed or customer-accepted
behavior. No new source manifest or certificate is needed.
