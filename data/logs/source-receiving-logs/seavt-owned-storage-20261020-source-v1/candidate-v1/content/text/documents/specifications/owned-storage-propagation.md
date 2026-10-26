# Explicit strict storage propagation (source candidate)

The existing File owner receives `durableRoot`: an explicit pre-existing,
already-durable caller-proved directory anchor, not an ownership or authority fact
inferred from a pathname. This Data package imports no NodeProcess Code API.
Systems callers receive their actual canonical section/data through the published
shared Code owner and supply that anchor to the original Data writer. Metadata
checks exclude redirects/wrong kinds on the File owner's supported native hosts;
they are not a malicious concurrent replacement sandbox or a new grant.

Propagate the existing optional `durableRoot` through `append`, `withFileLock`,
`sealLogs`, `sealDay`, `writeSegment`, and SEAVT row append wrappers. Calls without
the option retain original behavior. Receive actual lock/record/head/log/open/
sealing/partial/final paths at their original effects, including recovery cleanup.
Use original File strict descriptor and path receivers, its BGZF decoder and
barriers; do not copy a second storage policy or store. Strict lock cleanup checks
its own inode/device and refuses replacement. The old age-based stale-lock law
still does not fence a paused writer. Failure after any effect is not no-effect
proof or permission to retry an external operation.

Original auto-sealing, original BGZF sequence/cursors, cap and max-line refusal,
source/recovery bytes and native controls remain. A sealing failure still leaves a
successful append as successful and retains the original next-day/manual recovery
rule; strict metadata does not turn the whole multi-file operation into one crash
transaction. A standalone custom guard callback retains its own effect/authority
contract. The selected CSE arrival append has no such guard.

PR16's named carrier uses `filedAt`; its strict schema forbids adding `at`. Add an
explicit optional `at` filing input at the original generic `append` boundary.
Without it, original `line.at` and serialized at-first v1 bytes remain unchanged.
With it, the caller-supplied filing clock is admitted by the existing UTC contract;
a present `line.at` must agree. A line without `at` stays byte-shaped as authored,
so no at member is injected into the named schema. Original SEAVT wrappers derive
this explicit input through `atOf` and retain `carrierProfile`, SEN identity and
witness time. This filing context grants no semantic or actor authority.

Preserve all six original PR16 paths and v1 defaults, the actual named schema and
mixed native append/read tests. Full original owner native suppliers/tests, strict
positive/negative/recovery controls, packed public exports, deliberate immutable
release and actual CSE caller receiving are still required. Current Node3.1 and
CSE/GHS forward selectors are not accepted merely by writing this source. Parent
Data child declaration/mounted projection, BCF93 migration, Guix formation and
actual installed read/necessary write remain separately UNMET.
