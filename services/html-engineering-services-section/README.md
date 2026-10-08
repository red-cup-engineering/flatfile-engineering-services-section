# html-engineering-services-section

This is the one section for all HTML: rendering documents and fragments,
escaping, structural projection, Markdown-to-HTML, and HTML validity. It is
seated in computer-data serialization beside `xml-services-section` and
`json-services-section`; per that sibling's own README, "Vocabulary
refinements such as HTML and SVG must restrict this codec rather than owning
competing escaping or AST writers" — this section is that restriction, not a
competing HTML implementation.

It owns five services:

- `services/html-document-render-service` renders a data carrier and
  resolved CSS as a complete HTML document string.
- `services/html-structural-projection-service` provides Semantic Hypertext
  Packet (SHP) projection, scanning, linting, escaping, and structural HTML
  construction.
- `services/render-markdown-inline-html-service` renders Markdown inline
  spans (emphasis, links, code) to an HTML string.
- `services/render-markdown-inline-html-nodes-service` renders Markdown
  inline spans to structural HTML carrier nodes (the typed counterpart of
  the string renderer above), composing
  `html-structural-projection-service`.
- `services/render-markdown-block-html-service` renders a full Markdown
  document to block-level HTML, composing
  `render-markdown-inline-html-service` for inline spans.

Neither `html-document-render-service` nor `html-structural-projection-service`
owns filesystem custody. Reading and writing files remain separate file-service
operations.
