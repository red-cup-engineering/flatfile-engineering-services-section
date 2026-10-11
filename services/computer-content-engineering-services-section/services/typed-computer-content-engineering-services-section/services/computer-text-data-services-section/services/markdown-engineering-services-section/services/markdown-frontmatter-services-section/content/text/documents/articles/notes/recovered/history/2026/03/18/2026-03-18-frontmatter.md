---

description: "A structured metadata block at the start of a document, separated from the body, carrying machine-readable assertions about the document in key-value form."
aliases: [front matter, metadata block, front-matter]
structure: key-value-pairs
encodes: [assertions, relations, metadata]
parsed-separately-from: body
date-created: 2026-03-18
date-modified: 2026-04-01
title: Frontmatter
---

Frontmatter is a block of structured metadata placed at the start of a document, before the document body. It carries machine-readable assertions about the document — not the document's prose content, but facts about what the document is, what it relates to, and how it should be processed. The body carries human-readable content. The frontmatter carries structured assertions. They are co-located in one file, making the document self-describing.

The idea predates the name. Library catalog cards carried structured metadata — author, title, subject headings, call number — on the front of a physical card, with the body of the record on the back or in a linked file. The Dublin Core Metadata Initiative (1995) standardized fifteen elements (title, creator, subject, description, date, and others) for describing digital resources. What frontmatter adds to this tradition is co-location: instead of storing metadata in a separate system (a database, a catalog, a sidecar file), frontmatter places it inside the document itself.

Tom Preston-Werner introduced YAML frontmatter to static site generators with Jekyll in 2008. A YAML block delimited by `---` at the top of a markdown file carried the page's title, date, layout, and any custom fields the author wanted. Hugo, Gatsby, Eleventy, and Obsidian all adopted the convention. TOML frontmatter (delimited by `+++`) and JSON frontmatter exist but are less common. The format varies; the concept — structured assertions co-located with content, parsed separately from the body — is the same across all of them.

Frontmatter externalizes a document's relational assertions into a form a machine can read without parsing the body. A collection of frontmatter-bearing documents is queryable as a graph: each document is a node, each frontmatter key-value pair is an edge to another node or a literal value. This is the same structure as an RDF [triple](../../../../../../../../../../../../../information-science-services-section/content/text/glossary/terms/subject-predicate-object.md) store, realized in plain text. The document is the subject, the key is the predicate, the value is the object. Gottlob Frege's insight from *Begriffsschrift* (1879) — that a predicate is an unsaturated function waiting for an argument — maps directly onto this pattern: the key names a relation, the document saturates its subject position, and the value saturates its object position.

The power of frontmatter is that it makes a document self-describing without external tooling. A human can read the YAML and understand the document's relationships. A machine can parse the YAML and build a graph. Neither needs the other. This is why frontmatter-based systems scale differently from databases: there is no schema to maintain, no migration to run, no server to keep alive. The schema is implicit in the keys that documents actually use — it emerges from practice rather than being imposed in advance.
