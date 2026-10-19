# Handoff 3, 2026-10-19: the epistemic law, after the Data 0.7.0 rescan

Supersedes the Open list of `2026-10-19-epistemic-law-2.md`, except the jsnode-package 0.5.0 and code engine publication items (pipeline agent; do not hand-publish).

## Landed
- Item 1, rescan under Data 0.7.0. The harness (`admit.mjs`: translate with jsnode-package 0.4.0, admit `artifactSpecificationCandidate` with Data 0.7.0) was run over 54 migrated orders: the 31 in the PRs of handoff 1 and 2 that sit in a repo's own tree, 18 in submodule repos (icalendar, personal-no-buy, consumption-hedge, pool, position-sizing, ethereum, hive, javascript-node-import) and the 5 jsnode-package own orders and fixtures. Handoff 2 says 47; the list is not written down anywhere, so this set is a superset reconstructed from the migration PR file lists. Before the scan (Data 0.6): 54 admitted. After the scan: 49 admitted, 5 refused. Fixed: 5. Now 54 of 54 admit.
  - cloudflare-services-section#2 (merged): `per_page=50` measured against the Cloudflare api-schemas OpenAPI (commit 843eae2, evidence file with digest); `per_page=500` conjectured with a measurement plan (needs the live account) and a non-blocking question; `version: 1` derived (`record-version`).
  - computer-systems-fabrication-engineering-services-section#60 (merged): duplication intents order, `version: 1` derived (`record-version`).
  - consumption-hedge-service#1 (merged): `<startYear+1>` read as arithmetic; the label is now stated without arithmetic (no parameter).
  - ethereum-engineering-services-section#1 (merged): SIWE `Version` 1 measured against the ERC-4361 text (ethereum/ERCs c4ee980, captured, digest in the claim).
  - javascript-node-services-section#1 (merged): `rewrittenCallSites: 0` stated as the empty count (no parameter).
  - Not rescanned: the NWS order (needs jsnode-package 0.5.0 from the registry). Orders in repos I could not enumerate from PR file lists, if any, are unscanned.
  - Open from this: the `dns-records-page-size` conjecture (500) needs one live Cloudflare read (`result_info.total_count` per zone). The submodule parents' gitlinks (financial, systems-engineering, serialized-content, code-engineering) were not bumped for the submodule PRs above.
- Item 4: assisted-browser-services-section#8 (merged). `browser-resource-lease-runtime-module.candidate.json` is version 2 and admits under Data 0.7.0: 9 claims (6 derived; 3 conjectured: host memory 512 MB, tasks 32, scratch 64 MB, each with a plan and a non-blocking question, because the isolated assay host's limits are not in any repository). Script used: it rewrote the v1 JSON mechanically; the markdown record is unchanged. `persistent-page-runtime-module.candidate.json` in the same directory is also version 1 and is not migrated.

## Not landed
### Item 2: computer-inference-engine (PR 19 still OPEN, unmerged)
A fresh clone with `pnpm install --frozen-lockfile --ignore-scripts` (use pnpm; `npm install` thrashed for 30 minutes at 1.4 GB) and `node --test --test-concurrency=1 "test/**/*.test.mjs"` took 20 minutes: 849 tests, 797 pass, 51 fail, 1 cancelled (handoff 2 said 60 of 844). Nothing fixed yet. Failures by cause, from the messages:
1. Catalog drift (about 20): `content/openai/providers/catalog.json` has no `routingPolicy.order` / `freeFirstOrder`, while code and tests read them (`routingPolicy.order must be an array`, `catalog.routingPolicy.freeFirstOrder must be an array`). Also missing rows: `openrouter-cohere-north-free`, `cloudflare-workers-ai-gpt-oss` ("unknown provider"), ollama-local lacking `pricePerMillionTokensMicroUsd`. Tests: openai-compatible-chat-completion (11), free-first-pricing-justification (5), cloudflare-agent-delivery (2), openai-compatible-assistant-turn (2). Decide per test: restore the catalog fields the code needs, or retarget tests to the catalog's current shape.
2. Host state and credentials (environment, skip with a reason): speech-synthesis (5, `zero-cash-entitlement-not-admitted`, tens of seconds each), market-round-witness (1, `LegacyStoreRefused` reading `~/.local/state/561-group/settlements/computer-inference-engine`: the test must use a temp store), host-configuration (1, `local inference requires its host task custody dataRoot`), receiver-agent-effects (5, 100 s runtime, receiver or live provider), provider-runtime kernel capacity (1, 5 s timeout).
3. Layout assumptions (5): provider-exchange-cli symlinks and `lstat` of `llm-services-section/services/openai-services-section/scripts/run-one-exchange.mjs`, a path that exists only in the umbrella tree, not in this repo. Resolve from the repo's own `scripts/` or skip when the sibling tree is absent.
4. Undeclared dependency (1+): `typescript` imported by chat-turn-contract.test.mjs and not in package.json; file-level failures in execute-typed-inference-effect, meter-inference and office-work-feedback were not read and may be the same.
5. A2A market (4): `inference work-lot market transport refused the request`; `inference work output failed schema validation (oneOf)`; server-package-assembly (2) `'0.1.2' !== '1.0.0'`. Contract drift between the market schema and the client.
6. Single assertion drift (3): anthropic token-usage zero events, knowledge-vault claim extraction, model-routing-feedback.
Then land PR 19 (data only; its own change does not touch these tests).

### Item 3: code engine (not started)
Apply fix (a) of handoff 2 to `test/fabrication-receipt-eavt-fold.test.mjs` (remove the `the-rule` assay line at line 28 of `creationReceipt`; `creationDigest` hashes `admitJsnodeOperationPackageCreationReceipt(creation)` imported from `@red-cup-engineering/jsnode-package-services-section/admit-jsnode-operation-package-creation-receipt`, which exists in registry 0.4.0), then the carrier test, then the environment groups of handoff 1 item 5. Run the suite once as a baseline first (385 tests, 51 failing at handoff 1).

## Facts
- Cost: a full computer-inference-engine run is 20 minutes; run it in the background to a file and read the failing-tests block. Delete clones after use.
- Orders have no CI in their repos; the evidence for a data-only order is `admit.mjs` plus, for operation changes, `check-order.mjs`.
