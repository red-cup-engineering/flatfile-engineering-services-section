# Markdown source and carriers

This package reads, edits, renders, and locates Markdown. Implementations live
in `src/`; consumers import the named package subpath, for example
`@red-cup-engineering/markdown-engineering-services-section/read-markdown-document`.
There are no separately installed parsing, file, directory, or graph helpers.

`readMarkdownDocument` observes frontmatter, code boundaries, headings, links,
and assertions together. Editing, the vault compiler, browser rendering, and
CAIRN use those same source observations. YAML syntax belongs to the YAML codec;
Markdown owns its leading envelope and body. Invalid metadata can be returned
as a diagnostic while the document's prose remains readable.

`createMarkdownDocument(view, options)` retains own metadata keys, including
`__proto__`, without interpreting them as prototype setters. Its existing
default omits null and undefined attributes. A carrier that needs to preserve
an authored null can select `nullFrontmatter: "preserve"`; undefined remains
absent. `nullFrontmatter: "omit"` makes the default explicit. Other option
values are refused. This policy does not change body-key selection or semantic
linefeed normalization, and it does not admit arbitrary non-JSON YAML values.

The public package entry exports `invokeMarkdownService(operation, request)`.
The installed command uses the same operations:

```sh
markdown-engine read-markdown-document < request.json
```

Individual commands are also declared in `package.json`. Some accept operation
JSON; filesystem survey, search, and migration commands have their own argument
interfaces. The typed operation table is available through
`./type/markdown-text-engine`; dispatch (`@red-cup-engineering/javascript-node-services-section/invoke-markdown-typed-operation`) is
code in javascript-node. The operation table itself imposes no claim that filesystem
operations are pure.

Directory inventory, document reading, and relation projection have different
costs and completeness:

- `observe-markdown-vault-directory` enumerates Markdown candidates with ripgrep
  and admits regular files without following symlinks. `maxScan` bounds Markdown
  candidates, not unrelated files; `limit` bounds returned paths. Truncation and
  admission diagnostics are explicit. No document bodies are read.
- `read-markdown-file` and `read-markdown-carrier` read the requested carrier;
  the latter supports bounded sections and headings. Writes check the source
  revision before replacing content.
- `observe-markdown-document-index` projects metadata and features from source;
  `derive-markdown-vault-graph` projects relations from that index without I/O.
  CAIRN owns the revision-aware catalogue and requests a complete observation
  only for effects that require it, such as metadata queries and relations.

Inline rendering accepts an optional `allowedFeatures` list for narrower output
carriers. Unsupported syntax stays escaped literal source; feature recognition and
link admission still use the shared implementation.

Application-specific directory conventions are supplied as policy. Research
about Markdown belongs in [Markdown science](../../../../../../../../../../../science-services-section/services/engineering-science-services-section/services/computer-science-services-section/services/markdown-services-section/README.md).

## Reduced-precision date paths

The dating services represent only the precision supported by evidence. Their date
forms follow [EDTF Level 0](https://www.loc.gov/standards/datetime/) and the
[W3C date/time profile](https://www.w3.org/TR/NOTE-datetime):

| Evidenced precision | Collection-relative path |
| --- | --- |
| day | `YYYY/MM/DD/YYYY-MM-DD-slug.ext` |
| month | `YYYY/MM/YYYY-MM-slug.ext` |
| year | `YYYY/YYYY-slug.ext` |
| none | `undated/slug.ext` |

A time may appear as `HHMMh` only when an evidence record explicitly supplies
that time and a day-precision date. Zero placeholders such as `0000/00/00`,
invented `01/01` components, and inferred `0000h` timestamps are
nonconformant.

Date syntax and date meaning are separate. A document date, a dated source
filename, a backup capture date, an archive accession date, and a Git observation
date are distinct evidence relations even when their values happen to match.
`measure-markdown-date-evidence` reports every explicit locator lexeme without
choosing among them. A collection migration must preserve those observations in
an evidence ledger, explicitly select the filing date and its relation, project
the path, and then use `admit-markdown-date-path` to prove the path
does not claim more precision or a time absent from the selected evidence.

Pure file relocations must use a byte-preserving filesystem rename followed by
content-identity verification. Patch-based text reconstruction is not a move
primitive.

## Frontmatter maintenance

Frontmatter mutations are dry-run-first and operate only on a document's leading
YAML frontmatter. To remove a key from an explicit set of files:

```sh
node services/markdown-frontmatter-services-section/scripts/strip-markdown-frontmatter-key.mjs \
  --key provenance -- README.md content/example.md
```

Add `--apply` to write the reported changes. Nested values belonging to the key
are removed with it; body text and unrelated frontmatter retain their original
bytes and order.

The repository vocabulary migration is likewise a dry run unless passed
`--apply`:

```sh
node services/markdown-frontmatter-services-section/scripts/migrate-frontmatter-vocabulary.mjs
```

It removes `provenance` while crediting `Claude Opus`, folds `research-note`
into `note`, converts `draft-for-iteration` into the `draft` system tag, and
moves topical `tags` values to `keywords`. Its default system-tag vocabulary is
small and explicit; additional retained values may be supplied with repeated
`--system-tag VALUE` options.
