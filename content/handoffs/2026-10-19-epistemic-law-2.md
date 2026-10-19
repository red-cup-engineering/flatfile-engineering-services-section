# Handoff 2, 2026-10-19: the epistemic law, after round three

Supersedes the remaining-items list of `2026-10-19-epistemic-law.md`, except the Hive items (another agent).

## Landed
- Data 0.7.0 (PR 231): the scan reads backtick code spans; identifiers, versions, dates pass; `name=number`, `name: number`, bare numbers, comparisons and arithmetic need a claim. Published. NOT yet done: rerun `admit.mjs` over the 47 migrated orders and migrate what newly refuses (Cloudflare page sizes, limit/depth defaults).
- EAVT (eavt-services-section PR 7): every consumer of encode/decode/constitute uses canonical JSON (evidence `data/records/2026-10-19-work-order-evidence/eavt-row-line-consumers.json`); the three orders are on 0.11.2, version 2. No CBOR decision needed.
- jsnode-package 0.5.0 (PR 1, merged): front matter accepted, spans count it; suite 226 pass, 0 fail, 5 skip (`requires a local registry`); CLI binding drift fixed. NOT ON THE REGISTRY (registry still 0.4.0); the repo has no publish workflow.
- NWS order (climate-science PR 2, merged) admits only with jsnode-package 0.5.0.
- Inference expense order: `session_ids` removed (computer-inference-system PR 41).
- Runtime-module orders classified not-work-orders (computer-inference-engine PR 19, UNMERGED: that repo's suite has 60 failures on main-equivalent, 844 tests, unrelated to the data file; assisted-browser PR 7 merged). The browser order's sibling `.candidate.json` is version 1 and retired; migrating it to version 2 is open.

## Open
1. Publish jsnode-package 0.5.0.
2. Code engine to zero (not started beyond fix a): patch at `fabrication-receipt-eavt-fold-fix-a` below. Then the carrier test, and the 48 environment tests by group (see handoff 1). Code engine package.json says 0.4.9, registry 0.4.7: check publication too.
3. computer-inference-engine: 60 failing tests (Gemini, MCP principal, market lot...), diagnose.
4. Rescan the 47 orders under Data 0.7.0.

## Fix (a), apply to code engine `test/fabrication-receipt-eavt-fold.test.mjs`
Remove the `the-rule` assay line from `creationReceipt`; make `creationDigest` hash `admitJsnodeOperationPackageCreationReceipt(creation)` (import from `@red-cup-engineering/jsnode-package-services-section/admit-jsnode-operation-package-creation-receipt`).
