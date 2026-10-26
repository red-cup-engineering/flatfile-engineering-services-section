# Bare Cedar Fog enterprise store conversion receiving

This one-off branch restores the original, retained 2026-10-14 converter and its two helper modules. It is based on the final original-reader source, c7742ecfdaf154965039c44ace35b6f3aabe37db. It MUST NOT merge legacy readers into the runtime branch.

The converter's only source correction selects `canonicalJson` through JSON's root export. The former subpath has an import-only export condition and cannot pass through `createRequire().resolve`. The root export names the same function. Its behavior, original witness parsing, two-pass reference conversion, source stamps, refusal boundaries and candidate-only operation remain those of the retained converter.

The reader also needs Content Address's original `semantic-content-identity` export. That original source is restored separately at commit 6b173e1, preceding its removal in 3d97de55. Bind it only to this one-time source graph. Keep the original EAVT 0.10.4 artifact-path formula. Match source contents and exports; equal version strings alone do not qualify a supplier.

Run `CONVERSION_WRITER=<selected writer package> node --test test/one-time-store-conversion.test.mjs`. The regression checks the identical canonical supplier function, two original witnessed claim rows, a distinct Codex task, current reader counts and head closure, unchanged donor bytes, and existing/nested-output refusal. Fixtures stay under this source's typed data logs and are removed by their owning test.

Machine-specific source bindings, capacity admission, exact CLI inputs, donor stamps and candidate receiving receipts are under the owning SEAVT section's `data/records/enterprise-store-conversion-records/bare-cedar-fog-2026-10-21/`. Candidate stores and conversion logs belong to their respective enterprise sections. Current FeltOS's complete claim-session fold independently receives the candidates. Historical engineering conversion reports are distinct compatibility evidence and do not establish completeness of these fresh donors.

Candidates do not replace their donors. A configuration-selection review must account for donor-only custody and books, independently receive exact candidate/source identities, recheck the stamped donor inputs and select the root through its authored enterprise record before ordinary loops can consume it. No process stop, restart, transport activation or donor retirement is part of candidate preparation.
