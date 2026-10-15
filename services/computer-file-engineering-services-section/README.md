# Computer file engineering services section

## Temporary-file custody

All atomic text and byte writers, synchronous and asynchronous, acquire cleanup
custody only after exclusive creation of their temporary file succeeds. A
collision at that temporary path refuses with EEXIST and leaves the foreign
file and destination unchanged. Default writers still clean up their own
temporary files after failures and retain best-effort directory sync.

## Opt-in strict durable publication

The existing writeFileText, writeFileBytes and synchronous variants accept
{ durableRoot }. Default callers retain the portable best-effort directory-sync
behavior. Strict mode refuses unsupported directory sync instead of downgrading.

durableRoot must be an absolute, pre-existing directory whose entry and outside
ancestry the caller has already durably established. A string, stat result or
readable directory does not prove that precondition. The target must descend
from that anchor on one filesystem. Existing path components may not redirect
through symlinks; the actual opened file must be regular and on the anchor
device. Directory topology must stay stable during the operation. These checks
are not hostile-filesystem race protection, access policy or a writer fence.

Strict writes retain complete-write behavior, file/mode fsync, exclusive link
(flag wx) or atomic replacement rename, then fsync every directory from the
target parent through the anchor, bottom-up, including already-existing
directories. An exclusive link keeps its temporary source until that barrier
succeeds, then removes the redundant link and syncs cleanup. A failure after
publication is uncertain: the destination may already hold the new bytes.
Never infer absence or blindly recreate an external operation from that error.

The same owner exports narrow synchronous components for store composition:

- assertDurableFilePathSync(path, { durableRoot }) is read-only preflight.
  Missing descendants are allowed; the anchor must exist. It does not establish
  durability.
- openDurableFileSync(path, numericFlags, { durableRoot, mode, createParents })
  performs that preflight, optionally creates/rechecks descendants, then opens
  with no-follow and nonblocking flags and validates the actual descriptor.
  Truncation flags are refused before open. The caller owns closing the fd.
- syncFileDurablySync(path, { durableRoot }) reestablishes file and complete
  ancestry barriers for already-present bytes. It does not create or publish.

Append-only owners keep their own one-write append law; they reuse these path,
descriptor and barrier primitives rather than replacing a bucket with an atomic
file rewrite. A short shared append is refused, never completed by retrying
fragments across possible concurrent writers.


`@red-cup-engineering/computer-file-engineering-services-section` is the canonical physical-file operation
package: it reads bytes or UTF-8 text, atomically writes bytes or UTF-8 text,
and searches explicit file carriers. Its commands are `read-file`, `write-file`,
`search-file`, and `search-files`.

This section owns actual filesystem effects. Format-specific interpretation
(such as flatfiles, JSONL, Markdown, or EAVT) belongs in the corresponding
computer-content section and composes these operations rather than duplicating
their filesystem mechanics.

## Focused services

File operations are restricted to carriers with explicit canonical proof
paths, bytes, encodings, identity, and provenance evidence. Directory traversal
is typed discovery: it composes the path's morphisms. Catalog and content
digests witness that discovery but never replace the filepath identity.

Focused command-line services include:

- `scripts/read-file.mjs` and `scripts/write-file.mjs`
- `services/file-observation-services-section/services/searching-file-content-service/scripts/search-file-content.mjs`
- `services/file-projection-services-section/services/replacing-file-content-service/scripts/replace-file-content.mjs`
- `services/computer-filepath-engineering-services-section/services/searching-filepath-service/scripts/search-file-path.mjs`
- `services/computer-filepath-engineering-services-section/services/relocating-directory-service/scripts/relocate-directory.mjs`

`flatfile-engineering-services-section` owns file data whose admitted carrier is
a finite byte sequence in one file; the superseded `file-services-section`,
`file-data-services-section`, `content-services-section` and
`flatfile-services-section` aggregators were folded into this section, the
computer-content section and the flatfile section.
