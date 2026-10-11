# Record research question

Records one first-class research question as a Markdown carrier in a science
section's conventional question directory. It captures the question and
stops — it does not answer it, route it, or link it into any pipeline.

## Request shape

```
{
  root,
  sectionPath,
  slug,
  title,
  question,
  dateCreated,
  status?,
  research?,
  frontmatter?
}
```

- `root` — real directory confining the write.
- `sectionPath` — the owning section's path relative to `root` (confined:
  must not be absolute or escape `root`, including through a symbolic link).
- `slug` — lowercase letters, digits, and single hyphens; becomes the
  carrier's filename.
- `title`, `question`, `dateCreated` — required, non-empty strings.
- `status` — optional, defaults to `"open"`. One of `open`,
  `partially-addressed`, `resolved`.
- `research` — optional string; when present, rendered as a second block
  under the question in the document body.
- `frontmatter` — optional object of additional lowercase kebab-case
  frontmatter keys.

## Reserved frontmatter keys

`body`, `date-created`, `status`, `title`, and `type` are written by this
service and cannot be overridden through `frontmatter`; a candidate that
supplies any of them is refused.

## Write behavior

The carrier is opened `"wx"` (create-only) and never overwrites an existing
file — recording a question that already exists at the computed path fails
rather than clobbering it.

## Seat

The carrier is written to:

```
<sectionPath>/content/text/documents/articles/research-articles/questions/<slug>.md
```

## Exports

- `researchQuestionPath({ sectionPath, slug })` — computes the relative
  carrier address without writing anything.
- `recordResearchQuestion(request)` — validates the request, renders the
  document, and writes it, returning an immutable receipt.
