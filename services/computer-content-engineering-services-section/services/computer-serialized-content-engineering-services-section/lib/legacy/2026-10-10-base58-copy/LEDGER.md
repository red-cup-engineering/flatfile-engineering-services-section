# Retired: copy of base58-encoding-service

`src/base58.mjs` (Git blob c6dcd03c) was byte-identical to `@red-cup-engineering/base58-encoding-service`
(red-cup-engineering/serialized-data-services-section, `services/base58-encoding-service`). That service is
its owner by domain and by history: added in eb3ac27 (2026-10-06T06:15Z, "Recover shared
base58-encoding-service outside machine snapshot"). This section's copy came in 3314bea (2026-10-07T04:18Z).
It is kept here byte for byte. Under `legacy/`, the release tooling reads no runtime file from it.

| Copy (was) | Owner's export now |
|---|---|
| `./base58` → `src/base58.mjs` (`encode`, `decode`) | `@red-cup-engineering/base58-encoding-service` (`encode`, `decode`) |

The section's `./base58` export retires with the copy. No source Cold Red Gate pins imported it; only this
section's `test/binary-text.test.mjs` did, and it now reads the owner (a dev dependency). The section's own
`binary-text.mjs` keeps reading `@scure/base` directly, as before.
