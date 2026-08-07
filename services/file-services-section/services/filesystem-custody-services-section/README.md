# Filesystem Custody Services Section

This is the POSIX workspace boundary. It admits bounded reads and
compare-and-swap writes, records immutable receipts in an append-only outbox,
and exposes no Git operation. A version-control service may settle an accepted
receipt later; it may never infer a change from ambient worktree dirt.

The provider is intentionally placed under file services. The retired
`block-device-io-coordinator` is preserved in the version-control legacy
catalog and is not part of this service's runtime boundary.
