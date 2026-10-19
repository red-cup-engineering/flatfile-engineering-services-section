# Handoff 4, 2026-10-19: the epistemic law, after the NWS rescan and the inference-engine repair

Supersedes the Open list of `2026-10-19-epistemic-law-3.md`, except the Cloudflare `dns-records-page-size` live read and the submodule gitlink bumps (unchanged).

## Landed
- Item 1, NWS order. jsnode-package 0.5.0 is on the registry (`npm view ... version --prefer-online` gives 0.5.0). The NWS order is in `lenticule-science/climate-science-services-section` (the repo moved from red-cup-engineering), `content/text/documents/specifications/derive-set-of-nws-temperature-forecasts-work-order.md`. It was translated with the registry's jsnode-package 0.5.0 and admitted with Data 0.7.0: admitted, no refusal, nothing to fix. All 55 known orders now admit.
- Item 2, computer-inference-engine. PR 19 was already merged. Baseline on main (fresh clone, `pnpm install --frozen-lockfile --ignore-scripts`): 849 tests, 797 pass, 52 fail. `inference-fabric.test.mjs` leaves its node process alive after the last test; kill that process and the run continues. The repair is PR 21 (`repair-suite-drift`), merged; see "PR 21 result" at the end.
  - Catalog, decided by history: commit 0c7d145 hand-merged the section copy's catalog (`routingPolicy.order`, no cost asserted on a row, `openrouter-cohere-north`), and all code reads `order`. The catalog is the source of truth and the tests were retargeted. Restored what that merge dropped but code, a test and a measured note still need: row `cloudflare-workers-ai-gpt-oss` (providerFamily cloudflare-workers-ai), `execution.assistantToolContent: "empty-string"` on cloudflare-workers-ai (measured 2026-10-07), and the chat-turn contract's `reasoning_effort`, `reasoning_budget`, `chat_template_kwargs`.
  - Real defects fixed in code: the MCP and operation input schemas used one schema id for different principals (`schemaFrom` refuses redefinition); anthropic `usage: {}` counted as an observation; agent cards and a fixture used the retired profile strings `org.emsenn.rmn.*` where a2a-services-section (every version) reads `org.emsenn.sen.*`.
  - Undeclared `typescript` is now a devDependency (5.9.3, pnpm lock updated).
  - Host state: tests use temp roots (market-round-witness `journalRoot`), a fixture entitlement carrier (speech-synthesis writes `DIRECT_ENDPOINT_ACCOUNT_ENTITLEMENTS` for its fixture keys), and a wrapper test for the `mock.module` file (`execute-typed-inference-effect.mocked.mjs`, run by a child Node with `--experimental-test-module-mocks`).
  - Skips with reasons: the openai legacy exchange (umbrella sibling absent) and office-work-feedback (the wrapper skips when its child dies on the schema redefinition: feltos 0.21.7 pins organizing 0.3.5, the engine 0.6.5).

## Not landed or open
- Code engine (item 3) not done. Fix (a) was written in a clone and not tested; that clone is deleted. Redo: remove the `the-rule` assay line in `creationReceipt` of `test/fabrication-receipt-eavt-fold.test.mjs`, import `admitJsnodeOperationPackageCreationReceipt` from `@red-cup-engineering/jsnode-package-services-section/admit-jsnode-operation-package-creation-receipt`, and make `creationDigest` hash `canonicalJson(admitJsnodeOperationPackageCreationReceipt(creation))`. Run the baseline first (385 tests at handoff 1). Code engine main is at 0.4.11.
- computer-inference-engine, not fixed by PR 21: `test/dispatch/receiver-agent-effects.test.mjs` (5: command-agent `codex` fixture refused, `observer-timeout`, `one direct endpoint provider descriptor is required`, `Cannot read properties of undefined (reading 'model')`). The provider-runtime kernel-capacity test and the inference-fabric SIGTERM-child test (1000 ms bound) failed in the baseline and passed in the final run, so they are timing-sensitive, not fixed.
- Dependency gap: `DurableA2aTaskStore` in a2a-services-section 0.1.2 (latest; 0.1.3-dev.30 too) has no `claim`, which `src/dispatch/native-inference-tasks.mjs` calls. Local inference through the native task store fails `unreachable` (`taskStore.claim is not a function`). It needs an a2a-services-section release with `claim`, or an engine change.
- feltos 0.21.7 pins organizing 0.3.5 and the engine 0.6.5. Release feltos against the engine's organizing, then drop the skip in `office-work-feedback.test.mjs`.
- `loadDirectEndpointProviderDescriptors` takes 5 s per call; each speech test takes 12 to 40 s because of it.
- The engine's package.json says 0.1.24 and the registry has 0.1.22: publication is pending (pipeline; do not hand-publish).

## Facts
- The full engine suite takes about 30 minutes here. `pgrep -f` in a polling loop matches itself; use `ps -eo args | grep "[n]ode --test"`.
- In a blobless clone `git log -S` takes a minute or more; give it a timeout.
- The host allows one heavy command at a time, and a background test run holds that slot: git pushes from another shell wait on it.

PR 21 result: merged (squash). The same full command after the repair: 851 tests, 844 pass, 5 fail, 2 skipped (baseline 849 tests, 797 pass, 52 fail). The 5 failures are all in `receiver-agent-effects.test.mjs`.
