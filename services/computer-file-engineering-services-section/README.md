# Computer file engineering services section

`@red-cup-engineering/file-services` is the canonical physical-file operation
package: it reads bytes or UTF-8 text, atomically writes bytes or UTF-8 text,
and searches explicit file carriers. Its commands are `read-file`, `write-file`,
`search-file`, and `search-files`.

This section owns actual filesystem effects. Format-specific interpretation
(such as flatfiles, JSONL, Markdown, or EAVT) belongs in the corresponding
computer-content section and composes these operations rather than duplicating
their filesystem mechanics.
