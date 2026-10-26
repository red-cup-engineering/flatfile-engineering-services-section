# SEAVT source provenance and composition

This repository receives the complete existing SEAVT carrier/storage package, not a checkpoint-only library.

## Exact baseline

- Donor: red-cup-engineering/computer-data-engineering-services-section
- Donor commit: 1d34cc49bd6309915985209e19a5d6ff56819421
- Donor path: services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section/services/json-services-section/services/jsonl-services-section/services/eavt-services-section/services/semiotic-eavt-services-section
- Donor subtree: 02e98647fbea485a3abf1f85b53baaf0475775d0
- Baseline: all 30 tracked files, original bytes and modes. This is a source snapshot with provenance, not a rewritten or complete imported Git history. Original authorship and history remain available in the donor commit and its parents.
- No settlement state, logs, credentials, client data or installed node_modules belong to this baseline.

Repository naming follows the Science-owned ServiceSectionShape Engineering suffix rule at lenticule-science/science-services-section@0feb5d863f755578e6a2a67c3c39c8d656bdedc9, services/philosophy-services-section/services/relationality-services-section/services/agency-services-section/data/records/service-section-custody.ttl. The compatibility npm identity remains @red-cup-engineering/semiotic-eavt-services-section; this ownership move does not rename imports or claim that naming alone certifies institutional conformance.

## Explicit consumer composition

The existing workspace:* dependency contract is retained. This checkout alone is not a registry-installable composition, and workspace tests do not prove standalone npm installation. Consumers must provide the actual declared packages from admitted immutable sources; no unverified registry versions or fabricated source aliases substitute for them.

Source selection for subsequent consumer composition:
- computer-data-engineering-services-section: donor commit above, repository root.
- computer-file-engineering-services-section: same donor commit, services/computer-file-engineering-services-section. Its existing write-file export supplies strict durableRoot publication.
- json-services-section: same donor commit, services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section/services/json-services-section.
- json-schema-services-section: same donor commit, the JSON section's services/json-schema-services-section.
- eavt-services-section: same donor commit, the JSON section's services/jsonl-services-section/services/eavt-services-section.
- computer-content-address-engineering-services-section: red-cup-engineering/computer-content-address-engineering-services-section@2c31f3b06e500a5e5b67986f991855bdfb7d242f, the donor's accepted gitlink.
- uri-services-section: the URI package inside that same content-address owner/revision, not a presumed separate registry release.
- signcell: red-cup-engineering/signcell@d4afd1b14a8de52acc66a5970a78b02fa51b10aa, the donor's accepted apps/signcell gitlink.

These source selections and their transitive dependencies must be received together by the existing consumer materializer before installation or activation is claimed. The checkpoint source qualification used current SEAVT and file-writer source with the retained SWR dependency workspace. It proves the stated test scenarios at that composition, not arbitrary registry or future-provider compatibility.

## Collision and cutover gate

Data PR184 (head 4428c7151af5145473448688eb285cceb72e3426) changes 23 retained-custody/cutover paths in the same package. Its exact changed paths do not overlap the four checkpoint correction files. It remains pending in the donor owner and is not silently imported, discarded or treated as integrated. Coordination is recorded in https://github.com/red-cup-engineering/computer-data-engineering-services-section/pull/184#issuecomment-6200886974.

No donor subtree replacement, deletion, consumer source switch, deployment or access expansion is part of this baseline. Reconcile PR184's current head and path mapping, qualify the full consumer composition, then separately review a same-path donor gitlink replacement. That ordering preserves the existing parent path until destination source and consumers are independently received.
