---
title: "Cellular computation: capability disposition"
date-created: 2026-09-25
type: note
status: current
source-legacy-directory: "2026-06-17-cellular-computation"
---

The retired cellular-computation directory was a thirteen-document proposal for a Cellular Closure Engine (CCE), Cellular Data Serialization (CDS), an RTL term language, an ABI, JSON RPC, a node protocol, and an RDF profile. It contains no implementation, concrete cell instances, executable ABI or peer, or consumer. Its claimed current `content/documents/notes/SPEC.md` successor does not exist.

The useful effects are retained at their actual carriers.

| Proposed concern | Modern carrier | Retained effect |
| --- | --- | --- |
| CDS canonical form | `computer-data/.../json-services-section/scripts/canonical-json.mjs` | Strict canonical JSON for stable byte identity. |
| CDS content store | `computer-data/.../immutable-content-custody-service/src/immutable-content-custody.mjs` | Verified SHA-256 `ni:` identity and immutable injected-store custody. |
| RDF profile | `computer-data/.../computer-triplet-serialized-content-engineering-services-section` | RDF terms, named graphs, serialization, canonicalization, JSON-LD, and schema projection. |
| Closure, finite evidence, and formal concepts | `@red-cup-engineering/computer-code-engineering-services-section/closure/{settlement,ordinal,iterate,closure,lattices,formal-context,formal-concepts,directed-evidence}` | Explicit pure transformations over caller-provided carriers, including bounded fixed-point settlement and finite closure. |

`cds.md` and `cds-storage.md` therefore do not justify a special CDS schema or filesystem. `rdf-profile.md` does not provide a CCE vocabulary or data provenance that would require a new RDF layer. `rtl.md` supplies no reusable grammar or term carrier, and the CCE-specific site, fibre, fixed-layer, and repair claims in `cce.md` have neither instances nor consumers; no CCE DSL or engine is created. `cce-abi.md`, `cce-rpc.md`, and the node documents specify no deployed host or peer, so no ABI, endpoint, address space, lifecycle service, or system is retained.

The scientific terms remain distinct from that unimplemented proposal. The existing science glossary definitions for `closure-operator`, `closure-ordinal`, and `sheaf-condition` record the relevant abstract mathematics. A system may only claim the proposed sheaf-style gluing or closure result after it supplies an actual carrier with site, presheaf/restriction data, constraints, and checkable invariants. Naming those ideas in a specification is not such a result.

This disposition removes the downstream metrologic ownership of the reusable closure kernel: it is now directly importable from `computer-code`, where data, networking, and systems can use it without a math-system application dependency. The legacy proposal itself is retired rather than reified as a generic cellular-computation system.
