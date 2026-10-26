# Original Data fabrication admission received through native consumers

## Problem and original-owner correction

PR [240](https://github.com/red-cup-engineering/computer-data-engineering-services-section/pull/240) carries an existing, unintegrated correction to Data's artifact fabrication admission. A claimed admitted record previously passed a shallow type/version/digest check and could then fail while a planner or receipt builder dereferenced malformed nested values. The correction reconstructs the original candidate and invokes the original versioned specification admission with its retained digest before either consumer proceeds. It preserves the original source identity and produces the owner's typed refusal instead of treating a named admitted shape as proof.

The original ordinary-JSON predicate is bounded to 128 nesting edges and 65,536 visited values. It checks descriptors without invoking getters, refuses cycles, sparse arrays, symbol or extra array fields, and preserves shared acyclic values. This is the existing Data admission owner, not a competing schema or a fabricated physical-performance certificate. Original version-1 digest semantics remain distinct from version-2 epistemic claims and blocking questions. All five existing artifact kinds remain in scope: code, dataset, article, media and material.

## Exact integration composition

The fully qualified source is canonical `aa97dbafcb23d6f706edab52784621ee11b26467` plus the two original proposal blobs at `dc7a14beadb8884ef2dc424fdf5a209056c6d121`:

| Path | Git blob |
| --- | --- |
| `src/artifact-fabrication.mjs` | `7f3ea7870a04ad0008b7ba388de3e6b8a0d604b8` |
| `test/artifact-fabrication.test.mjs` | `37d3fc0948a514cdc85e21ce9411c9f5995609c3` |

Current canonical main advanced concurrently to `2347baf394da020f851ff4f6250e5e251d258bb6`. The provider compare reports one changed path only: the `apps/signcell` gitlink advances from `ea28506f10abdb307336b5a99f6f006e29c6e604` to `8cbca8ddd71157e68fec59d611b6caf7817ab90a`. The integration retains that newer pin. It does not alter any source, test, manifest or supplier consumed by the qualification below. The original PR head is retained as an additional merge parent; no branch or tag is deleted.

## Complete native Data gate

The original `npm test` command ran on Node v24.22.1 against the current 26-file test population, including the proposed original artifact-fabrication cases. Result: **267 passed, zero failed, skipped or cancelled**, in 3,412.555697 ms. The command used the native Node test runner, original cryptographic/content-address/JSON suppliers and ordinary Node resolution. No digest, schema validator or assertion implementation was substituted.

The [complete native log](native.log) is retained as emitted by Node's spec reporter. Its SHA-256 is `af5a738bc4765ade458d81b94ba33147767efc75a4039c8ba45eed21af20f432`. No source was changed after that result. The qualification source included the original relative Metrologic file `lib/metrologic/src/number/finite-capacity.mjs`, Git blob `953a01e63f35861af53a6e7a89a64eb42be090ee`, required by the existing resource-capacity module.

The eight original supplier selections match their received exact package versions and lock integrity declarations. Their existing importer-relative closures were reused without package installation or source modification:

| Supplier | Edition | Original archive integrity |
| --- | --- | --- |
| `@cto.af/wtf8` | `0.0.6` | `sha512-xp/zbWLXuh2WBxi9tIc+Jep7BAwLu8ETTI8xN68ks10bxOBMISs/jcu9DBEkOeGXLaTKUbA0Y2Ficx/jmmPABg==` |
| `@red-cup-engineering/cbor-services-section` | `0.1.1` | `sha512-uUsHbXjvaFihU5JavrJpbG44Hdcg2r7zADeWgM6DO6YeIcSsAo4FrYh35pwzAqLpqQbQJrIOsDVzrccyWURu5g==` |
| `@red-cup-engineering/cryptographic-computer-data-engineering-services-section` | `0.3.1` | `sha512-5a5fFFLCntjl4f61TGxcUOVGwCyKhjup/k0f4irnsXA/BC5alsZzeij0NPf6NzAW8kAOQ9u72L7tg8L/2ZuhSA==` |
| `@red-cup-engineering/exact-number-data-service` | `0.1.1` | `sha512-D54dcxY7eqK23lktqbv0HjjNNroY2clDJ1K5TW7pWN2NBeDOGbS53yGv7sAYfToPn3YH8pKrpBVAB1URg8kcuA==` |
| `@red-cup-engineering/json-services-section` | `0.4.0` | `sha512-WjToogRIj9qq5VaPQ52Lao8v/rXhSX7umi+rEn0Xysnfv6qAv77llXe68wboADrpQK2micSBS3DSGJWd5CoZkg==` |
| `@red-cup-engineering/semiotic-content-address` | `0.1.0` | `sha512-5+Rap5Ya8biH9nRzVl4HadfIuNomBYfxdDtV7Ly35wvTPrEYrglXZRuXY9Mg0vGQXruTrlBzxaAiYQUXvgyIaQ==` |
| `@red-cup-engineering/uri-services-section` | `0.1.1` | `sha512-y5Ipia5hTOLT/0lzEX+DAC/qtfT7ey17jNT/2dh7r0fqromCUxUOQiJOYaapXXWqe79T1sCEmICjukFuLvizmw==` |
| `cbor2` | `2.4.0` | `sha512-s6+CPoEI6tgwasK2cWMTXt5sy8Yxo4vgRmKgkJSCdKDL/0bHU3aYJoYeHRX7/oywKYA3bxcpqEYkXkrdHe0+0Q==` |

## Original downstream consumer receiving

The [independent JSNode receiving](../2026-10-26-data-pr240-jsnode/receiving.md) qualifies this prospective Data source through the original JSNode package at `2f4d07de3b92b54bdc7acc95914dfd70fa31a812`. Its bounded native gate passes **12 of 12** cases, including the unchanged connected fabrication, module projection and fabrication-record discovery operations plus adversarial admission controls. It makes zero external inference calls.

The receiver's [source custody](../2026-10-26-data-pr240-jsnode/source-custody.json) is consumed by its [repeatable receiving test](../2026-10-26-data-pr240-jsnode/consumer-receiving.test.mjs). These retain 117 original consumer source files, actual supplier selections and both Data proposal blobs. The original consumer still declares Data 0.7.0; the explicitly selected prospective source actually declares 0.7.1. The receiving makes that difference visible rather than relabelling an unpublished source.

## Repeated operational behavior and remaining receiving

The original plan and receipt operations now perform this admission on every call. Their existing deterministic tests and downstream receiver encode the recurring normalization/refusal class; no frontier model is needed to advance it. This is source integration and native consumer compatibility, not immutable package publication or installed fleet selection. Physical fabrication, external delivery and independent performance claims require their original evidence. The separate current Data packaging of its relative Metrologic resource-capacity import is not qualified by this source-tree test result and remains a distinct package-receiving obligation.
