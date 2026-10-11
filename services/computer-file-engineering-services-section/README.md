# Computer file engineering services section

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
